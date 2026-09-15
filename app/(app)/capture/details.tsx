import { useEffect, useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { Typography } from '../../../components/ui/Typography';
import { Toggle } from '../../../components/ui/Toggle';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { CustomFieldInput, isCustomFieldFilled } from '../../../components/app/CustomFieldInput';
import { NoEventNotice } from '../../../components/app/NoEventNotice';
import { EventContextBar } from '../../../components/shared/EventContextBar';
import { VoiceRecorder } from '../../../components/capture/VoiceRecorder';
import { CameraIcon, TrashIcon } from '../../../components/ui/icons';
import { KeyboardSafe } from '../../../components/app/KeyboardSafe';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useCaptureDraftStore } from '../../../stores/useCaptureDraftStore';
import { useEventFieldsStore } from '../../../stores/useEventFieldsStore';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useCurrentEvent } from '../../../hooks/useEvents';
import { fetchEventFields } from '../../../lib/api/eventFields';
import { normaliseCardPhoto } from '../../../lib/cardPhoto';
import { persistCapture } from '../../../lib/captureFiles';
import type { Recording } from '../../../hooks/useVoiceRecorder';
import type { CustomFieldValue } from '../../../data/leads';

/**
 * Everything the rep knows that the card does not.
 *
 * This replaces the old confirm screen, and the difference is what is NOT here:
 * no name, no phone, no company, no proof-reading. Those come off the card, and
 * the card is read afterwards by the sync drain — so the rep is never held at
 * the stall waiting for a network call to finish before they can save.
 *
 * What is left is the three things only the person standing there can supply:
 * what was said (the voice note), what the event asks about them (the custom
 * fields the admin set up), and anything worth a photograph beyond the card
 * itself. Plus the consent toggle, which is a legal record of a conversation
 * and cannot be inferred from anything.
 *
 * The card preview sits at the top with a Retake, because the one thing worth
 * checking here IS answerable at a glance: whether the photo came out. A
 * blurred card cannot be re-taken later — the person has walked away.
 */
export default function CaptureDetailsScreen() {
  const imageUri = useCaptureDraftStore((s) => s.imageUri);
  const backImageUri = useCaptureDraftStore((s) => s.backImageUri);
  const extraPhotoUri = useCaptureDraftStore((s) => s.extraPhotoUri);
  const setExtraPhotoUri = useCaptureDraftStore((s) => s.setExtraPhotoUri);

  const customFields = useEventFieldsStore((s) => s.customFields);
  const setFields = useEventFieldsStore((s) => s.setFields);

  const user = useSessionStore((s) => s.user);
  const { event } = useCurrentEvent();

  const [customValues, setCustomValues] = useState<Record<string, CustomFieldValue>>({});
  const [consent, setConsent] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);

  /**
   * The recorder reports its finished recording up to here.
   *
   * Written straight into the capture draft rather than held in local state, so
   * it survives the app being backgrounded mid-capture — which, on a screen
   * where a rep may spend a minute, is not a rare event.
   */
  const handleRecording = useCallback((recording: Recording | null) => {
    useCaptureDraftStore.getState().setVoiceNote(recording);
  }, []);

  // The fields on this form belong to this event, and an admin can change them
  // mid-show — so they are loaded here rather than trusted from whatever the
  // editor happened to leave behind.
  useEffect(() => {
    if (!event?.id) return;
    let cancelled = false;
    fetchEventFields(event.id)
      .then((fields) => {
        if (!cancelled) setFields(fields);
      })
      .catch(() => {
        /* Offline: the fields already cached on the device are used instead. */
      });
    return () => {
      cancelled = true;
    };
  }, [event?.id, setFields]);

  const addExtraPhoto = async (from: 'camera' | 'library') => {
    if (addingPhoto) return;
    setAddingPhoto(true);
    try {
      const result =
        from === 'camera'
          ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
          : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });

      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];

      /**
       * Resized and re-encoded, unlike the card.
       *
       * `normaliseCardPhoto` is skipped for the card shutter on purpose — the
       * extraction accuracy was measured on untouched frames. That reasoning
       * does not apply here: nothing reads this photo, it is only ever looked
       * at, and a 12-megapixel product shot is a sync that never finishes on
       * hall wifi.
       */
      const photo = await normaliseCardPhoto(asset.uri, asset.width, asset.height);
      if (!photo.ok) {
        Alert.alert("Couldn't add that photo", photo.message);
        return;
      }
      setExtraPhotoUri(await persistCapture(photo.uri, 'extra.jpg'));
    } catch {
      Alert.alert("Couldn't add that photo", 'Try again, or skip it.');
    } finally {
      setAddingPhoto(false);
    }
  };

  const retake = () => {
    useCaptureDraftStore.getState().setImageUri(null);
    useCaptureDraftStore.getState().setBackImageUri(null);
    router.replace('/(app)/capture/camera');
  };

  const missingRequired = customFields.some(
    (f) => f.required && !isCustomFieldFilled(f, customValues[f.id])
  );

  /**
   * No name requirement, which the old confirm screen had.
   *
   * It could not survive: there is no name on this screen to require. What is
   * required instead is a photo — without one there is nothing for the card
   * reader to read, and the lead would arrive permanently blank.
   */
  const canSubmit = Boolean(imageUri) && !missingRequired && Boolean(event && user) && !isSaving;

  const submit = async () => {
    if (!canSubmit || !event || !user) return;
    setIsSaving(true);

    const draft = useCaptureDraftStore.getState();
    const lead = await useLeadsStore.getState().addLead({
      organizationId: user.organizationId,
      eventId: event.id,
      capturedBy: user.id,
      source: 'card_scan',
      consentGiven: consent,
      // Blank on purpose. Everything a person is called comes off the card, and
      // the card has not been read yet.
      name: '',
      customFieldValues: customValues,
      imageUri: draft.imageUri ?? undefined,
      backImageUri: draft.backImageUri ?? undefined,
      extraPhotoUri: draft.extraPhotoUri ?? undefined,
      voiceUri: draft.voiceUri ?? undefined,
      voiceDurationSeconds: draft.voiceDurationSeconds,
      voiceExtension: draft.voiceExtension,
      hasVoice: draft.hasVoice,
    });

    useCaptureDraftStore.getState().reset();
    router.replace({ pathname: '/(app)/capture/processing', params: { leadId: lead.id } });
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="Add details" />

      <KeyboardSafe>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-5 pt-5 pb-6"
          showsVerticalScrollIndicator={false}
        >
          {!event ? <NoEventNotice /> : <EventContextBar className="mb-4" />}

          {/* The card, big enough to tell whether it came out. `contain`, not
              `cover`: a cropped preview would hide exactly the edge that got
              cut off, which is the thing worth spotting. */}
          <View className="rounded-md overflow-hidden bg-navy" style={{ aspectRatio: 8 / 5 }}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="contain" />
            ) : null}
          </View>

          <View className="flex-row items-center justify-between mt-[10px] mb-5">
            <Typography className="text-[12px] text-slate">
              {backImageUri ? 'Front and back captured' : 'Card captured'}
            </Typography>
            <Pressable onPress={retake} hitSlop={8}>
              <Typography className="text-[12.5px] font-bold text-blue">Retake</Typography>
            </Pressable>
          </View>

          <Typography
            className="text-[10px] font-bold tracking-[0.12em] text-slate mb-3"
            style={{ textTransform: 'uppercase' }}
          >
            Voice note
          </Typography>
          <VoiceRecorder variant="inline" onChange={handleRecording} />

          <Typography
            className="text-[10px] font-bold tracking-[0.12em] text-slate mt-6 mb-3"
            style={{ textTransform: 'uppercase' }}
          >
            Photo
          </Typography>
          {extraPhotoUri ? (
            <View>
              <View className="rounded-md overflow-hidden bg-surface" style={{ aspectRatio: 4 / 3 }}>
                <Image
                  source={{ uri: extraPhotoUri }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
              <Pressable
                onPress={() => setExtraPhotoUri(null)}
                className="flex-row items-center justify-center gap-2 mt-[10px] h-11 rounded-md bg-white border border-hairline"
              >
                <TrashIcon />
                <Typography className="text-[13px] font-semibold text-navy">Remove photo</Typography>
              </Pressable>
            </View>
          ) : (
            <View className="flex-row gap-[10px]">
              <Pressable
                onPress={() => void addExtraPhoto('camera')}
                disabled={addingPhoto}
                className={`flex-1 h-12 rounded-md border border-dashed border-hairline bg-white items-center justify-center flex-row gap-2 ${
                  addingPhoto ? 'opacity-60' : ''
                }`}
              >
                <CameraIcon size={15} color="#0B132B" />
                <Typography className="text-[13px] font-semibold text-navy">Take a photo</Typography>
              </Pressable>
              <Pressable
                onPress={() => void addExtraPhoto('library')}
                disabled={addingPhoto}
                className={`flex-1 h-12 rounded-md border border-dashed border-hairline bg-white items-center justify-center ${
                  addingPhoto ? 'opacity-60' : ''
                }`}
              >
                <Typography className="text-[13px] font-semibold text-navy">Choose one</Typography>
              </Pressable>
            </View>
          )}
          <Typography className="text-[11.5px] text-placeholder mt-2">
            Optional — the product they asked about, or anything worth remembering.
          </Typography>

          <Typography
            className="text-[10px] font-bold tracking-[0.12em] text-slate mt-6 mb-3"
            style={{ textTransform: 'uppercase' }}
          >
            Event fields
          </Typography>
          {customFields.length === 0 ? (
            <Typography className="text-[12.5px] text-slate">
              No custom fields set for this event.
            </Typography>
          ) : (
            <View className="gap-4">
              {customFields.map((field) => (
                <CustomFieldInput
                  key={field.id}
                  field={field}
                  value={customValues[field.id]}
                  onChange={(value) => setCustomValues((prev) => ({ ...prev, [field.id]: value }))}
                />
              ))}
            </View>
          )}

          <Pressable
            onPress={() => setConsent((c) => !c)}
            className="flex-row items-center justify-between bg-white border border-hairline rounded-md px-4 py-[14px] mt-5"
          >
            <View className="flex-1 pr-3">
              <Typography className="text-[13px] font-semibold text-navy">
                Consent to follow up
              </Typography>
              <Typography className="text-[11.5px] text-slate mt-[2px]">
                Confirmed verbally at the stall
              </Typography>
            </View>
            <Toggle value={consent} onValueChange={setConsent} />
          </Pressable>
        </ScrollView>

        <View className="bg-white border-t border-hairline flex-row gap-[10px] px-5 pt-[14px] pb-6">
          <Pressable
            onPress={retake}
            className="h-[54px] px-5 rounded-md bg-white border border-hairline items-center justify-center"
          >
            <Typography className="text-[14px] font-bold text-navy">Retake</Typography>
          </Pressable>
          {/* Both branches carry a shadow; only its alpha changes. This button
              goes from disabled to enabled the moment the last required custom
              field is filled, and a class list that gains its FIRST `shadow-*`
              mid-life makes NativeWind try to upgrade the component and throw
              the unrelated "Couldn't find a navigation context". See AGENTS.md. */}
          <Pressable
            disabled={!canSubmit}
            onPress={() => void submit()}
            className={`flex-1 h-[54px] rounded-md items-center justify-center ${
              canSubmit
                ? 'bg-gold shadow-[0_10px_24px_rgba(244,176,0,0.30)]'
                : 'bg-surface shadow-[0_10px_24px_rgba(244,176,0,0)]'
            }`}
          >
            <Typography
              className={`text-[16px] font-bold ${canSubmit ? 'text-navy' : 'text-slate'}`}
            >
              {isSaving ? 'Saving…' : 'Submit'}
            </Typography>
          </Pressable>
        </View>
      </KeyboardSafe>
    </SafeAreaView>
  );
}
