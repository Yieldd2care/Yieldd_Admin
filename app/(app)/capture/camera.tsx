import { useRef, useState } from 'react';
import { Image, Linking, Platform, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import { Typography } from '../../../components/ui/Typography';
import { CheckIcon, CloseIcon, FlashIcon, ImageIcon } from '../../../components/ui/icons';
import { RadialGlow } from '../../../components/ui/RadialGlow';
import { normaliseCardPhoto } from '../../../lib/cardPhoto';
import { useCaptureDraftStore } from '../../../stores/useCaptureDraftStore';

export default function CameraScreen() {
  const [flashOn, setFlashOn] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [picking, setPicking] = useState(false);
  /**
   * One error line for both ways a photo can fail to arrive — the picker
   * refusing to open, and the shutter handing back nothing. They are shown in
   * the same place and cleared by the same actions, so splitting them would
   * only make it possible to display two contradictory lines at once.
   */
  const [captureError, setCaptureError] = useState<string | null>(null);
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isProfileScan = mode === 'profile';

  /**
   * One flag for both sources, and it has to cover every control.
   *
   * The picker runs in another process, so without this the rep can tap "Skip
   * the back" while it is open: that navigates to the confirm screen, the
   * extraction starts on the front alone, and then the picker resolves and
   * writes `backImageUri` into the store from a screen that has already gone.
   * The confirm screen's effect is keyed on that value, so it re-runs — a second
   * billed read of the same card, racing the first over fields the rep may
   * already be correcting by hand.
   */
  const busy = capturing || picking;

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const setImageUri = useCaptureDraftStore((s) => s.setImageUri);
  /**
   * Read back, not just written. The rep photographs the front and the screen
   * silently moves on to the back, so nothing on screen said the first shot
   * had been taken or kept. This is what the thumbnail below is drawn from.
   */
  const frontImageUri = useCaptureDraftStore((s) => s.imageUri);
  const setBackImageUri = useCaptureDraftStore((s) => s.setBackImageUri);

  /**
   * Which side is being photographed.
   *
   * The back is offered, never required. Most cards carry nothing useful on it,
   * so demanding a second photo would slow every capture at a stall to help a
   * minority of cards — but Indian cards that print a branch or works address
   * often print it on the back, and that is exactly what was being lost.
   */
  const [side, setSide] = useState<'front' | 'back'>('front');

  /**
   * Is there a front photo to confirm, and is confirming it the useful thing
   * to do right now? Both halves matter. Tied to the stored photo rather than
   * to the step, so the tick and the thumbnail can never claim a front the
   * store is not actually holding.
   */
  const hasFront = side === 'back' && !!frontImageUri;

  const goToConfirm = () =>
    router.push(isProfileScan ? '/(app)/card/scan-confirm' : '/(app)/capture/confirm');

  /**
   * The same card, from a photo the rep already had.
   *
   * Deliberately drives the same `side` machine as the shutter instead of a
   * parallel one, which is what makes front-and-back work here for free — and
   * lets the two sides come from different places, a gallery front with a
   * photographed back or the other way round.
   *
   * NO PERMISSION REQUEST, and that is not an oversight — `card/edit.tsx` does
   * ask, so this reads like one. `launchImageLibraryAsync` needs no permission on
   * either platform: Android goes straight to the system picker with no check at
   * any API level, and on iOS the picker runs outside the app. Calling
   * `requestMediaLibraryPermissionsAsync` is what *creates* a full-library
   * prompt, which is the gratuitous ask this project already went out of its way
   * to remove from the save-to-gallery paths.
   */
  const pickFromLibrary = async () => {
    if (busy) return;
    setPicking(true);
    setCaptureError(null);
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        /**
         * Android only, and `aspect` is Android-only too.
         *
         * Apple's crop box is locked square and cannot zoom out past the photo's
         * own height, so on a photo where the card already fills the width the
         * rep physically cannot fit the whole card inside it — it clips the
         * sides, which is where the phone number usually sits. A clipped number
         * reads as a *wrong* number, and a wrong value is worse than a blank one:
         * a rep proof-reads an empty field and trusts a filled one. So iPhone
         * sends the photo whole and lets the reader cope.
         */
        allowsEditing: Platform.OS === 'android',
        aspect: [8, 5],
        quality: 0.8,
      });

      // Nothing is written to the store on a cancel. Clearing the back here
      // would lose it for a rep who came back to re-pick the front and then
      // thought better of it.
      if (picked.canceled || !picked.assets[0]) return;

      const asset = picked.assets[0];
      const photo = await normaliseCardPhoto(asset.uri, asset.width, asset.height);
      if (!photo.ok) {
        setCaptureError(photo.message);
        return;
      }

      if (side === 'front') {
        // Same reasoning as the shutter: a fresh front orphans any previous back.
        setImageUri(photo.uri);
        setBackImageUri(null);
        setSide('back');
        return;
      }

      setBackImageUri(photo.uri);
      goToConfirm();
    } catch (err) {
      // Unlike `capture()` below, this catches. The picker throws for real
      // reasons — no gallery app resolves the intent on some stripped Android
      // builds — and a button that silently does nothing is the worst outcome.
      if (__DEV__) console.warn('[camera] pickFromLibrary', err);
      setCaptureError("Couldn't open your photos. Try again.");
    } finally {
      setPicking(false);
    }
  };

  const capture = async () => {
    if (busy || !cameraRef.current) return;
    setCapturing(true);
    setCaptureError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });

      if (side === 'front') {
        // Nothing came back, so there is nothing to confirm. Advancing here
        // used to be harmless-looking — the rep simply found themselves on the
        // back step — but the screen now says "Front captured", and a screen
        // that says so when it holds no front is worse than one that says
        // nothing. Stay put and let them press again.
        if (!photo) {
          setCaptureError('That shot did not save. Try again.');
          return;
        }

        // A fresh front means any back left from a previous card is not this
        // card's back, and sending it would put a stranger's address on a lead.
        setImageUri(photo.uri);
        setBackImageUri(null);
        setSide('back');
        return;
      }

      if (photo) setBackImageUri(photo.uri);
      goToConfirm();
    } finally {
      setCapturing(false);
    }
  };

  const skipBack = () => {
    setBackImageUri(null);
    goToConfirm();
  };

  /**
   * Retake the front.
   *
   * The thumbnail is the only thing on screen that looks like the photo just
   * taken, so it is the first thing a rep prods when the shot came out blurred.
   * A picture that looks tappable and is not would be worse than no picture, so
   * it goes back to the front step rather than being decoration.
   *
   * The stored front is cleared on the way, which keeps the confirmation
   * honest: the badge says a front is held, so it must not survive the decision
   * to replace it.
   */
  const retakeFront = () => {
    if (busy) return;
    setCaptureError(null);
    setImageUri(null);
    setBackImageUri(null);
    setSide('front');
  };

  if (!permission) {
    return <View className="flex-1 bg-[#05070d]" />;
  }

  if (!permission.granted) {
    /**
     * `canAskAgain` is the whole point of this branch.
     *
     * Once someone has denied the camera, iOS ignores requestPermission()
     * entirely — the OS prompt never appears again. A "Grant permission" button
     * at that point does nothing at all when tapped, which reads as a broken
     * app. When the OS will not ask again, the only real route is Settings.
     */
    const canAsk = permission.canAskAgain;
    return (
      <View className="flex-1 bg-[#05070d] items-center justify-center px-8 gap-5">
        <Typography className="text-[15px] font-semibold text-white text-center">
          Camera access is needed to scan business cards
        </Typography>
        {!canAsk ? (
          <Typography className="text-[13px] text-white/[0.62] text-center leading-[1.5] max-w-[280px]">
            It is switched off for Yieldd in your phone&rsquo;s settings.
          </Typography>
        ) : null}
        <Pressable
          onPress={() => (canAsk ? void requestPermission() : void Linking.openSettings())}
          className="bg-gold rounded-full px-6 py-3"
        >
          <Typography className="text-[14px] font-bold text-navy">
            {canAsk ? 'Grant permission' : 'Open settings'}
          </Typography>
        </Pressable>

        {/*
          Reading a saved photo needs no camera, so this route stays open to
          someone who has turned the camera off — and they are the likeliest
          people to be working from photos in the first place.

          It carries its own skip link and its own error line because this branch
          returns before the bottom bar renders, so there is nowhere else for
          either to appear. Without the skip, a rep who picks a front here would
          be stranded on the back step with no way forward but manual entry.
        */}
        <Pressable onPress={pickFromLibrary} disabled={busy}>
          <Typography className="text-[13px] font-bold text-gold">
            {side === 'front' ? 'Choose a saved photo instead' : 'Choose the back from your photos'}
          </Typography>
        </Pressable>
        {side === 'back' ? (
          <Pressable onPress={skipBack} disabled={busy}>
            <Typography className="text-[13px] font-semibold text-white/[0.80]">
              Skip the back &mdash; read the front
            </Typography>
          </Pressable>
        ) : null}
        {captureError ? (
          <Typography className="text-[12px] text-[#FF9B9B] text-center max-w-[280px] leading-[1.45]">
            {captureError}
          </Typography>
        ) : null}

        <Pressable onPress={() => router.replace(isProfileScan ? '/(app)/card/edit' : '/(app)/capture/manual')}>
          <Typography className="text-[13px] font-semibold text-white/[0.80]">Enter manually instead</Typography>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#05070d]">
      <CameraView ref={cameraRef} style={{ flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} facing="back" flash={flashOn ? 'on' : 'off'} />
      <RadialGlow color="#1D3F8A" size={600} style={{ top: -180, left: 30, opacity: 0.3 }} />

      <View className="flex-1 items-center justify-center">
        <View className="w-[322px] h-[203px] relative">
          {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
            <View
              key={corner}
              className="absolute w-7 h-7 border-gold"
              style={{
                borderTopWidth: corner === 'tl' || corner === 'tr' ? 3 : 0,
                borderBottomWidth: corner === 'bl' || corner === 'br' ? 3 : 0,
                borderLeftWidth: corner === 'tl' || corner === 'bl' ? 3 : 0,
                borderRightWidth: corner === 'tr' || corner === 'br' ? 3 : 0,
                top: corner === 'tl' || corner === 'tr' ? -3 : undefined,
                bottom: corner === 'bl' || corner === 'br' ? -3 : undefined,
                left: corner === 'tl' || corner === 'bl' ? -3 : undefined,
                right: corner === 'tr' || corner === 'br' ? -3 : undefined,
              }}
            />
          ))}
        </View>
        {/*
          The pill carries the confirmation as well as the instruction, because
          it is already where the rep is looking. A tick and the words "Front
          captured" answer the question the old copy left open — the back step
          announced itself but never said the front had been kept.
        */}
        <View className="mt-8 flex-row items-center gap-[7px] bg-navy/[0.55] border border-white/[0.12] rounded-full px-[18px] py-[9px]">
          {hasFront ? <CheckIcon size={13} color="#4ED17F" strokeWidth={2.8} /> : null}
          <Typography className="text-[12.5px] font-semibold text-white">
            {side === 'front'
              ? 'Align the card within the frame'
              : hasFront
                ? 'Front captured — now the back, or skip'
                : 'Now the back — or skip if it is blank'}
          </Typography>
        </View>
        {side === 'back' ? (
          <Typography className="mt-3 text-[12px] text-white/[0.62] text-center max-w-[260px] leading-[1.5]">
            Worth doing if the card prints a branch or works address on the back.
          </Typography>
        ) : null}
      </View>

      <View className="absolute top-0 left-0 right-0 flex-row items-center justify-between px-5 pt-14">
        <Pressable onPress={() => router.back()} className="w-[38px] h-[38px] rounded-full bg-navy/[0.55] border border-white/[0.14] items-center justify-center">
          <CloseIcon size={14} color="#fff" />
        </Pressable>
        <Pressable
          onPress={() => setFlashOn((v) => !v)}
          className={`w-[38px] h-[38px] rounded-full border border-white/[0.14] items-center justify-center ${flashOn ? 'bg-gold' : 'bg-navy/[0.55]'}`}
        >
          <FlashIcon color={flashOn ? '#0B132B' : '#fff'} />
        </Pressable>
      </View>

      <View className="absolute left-0 right-0 bottom-0 items-center gap-[22px] pb-11">
        {captureError ? (
          <View className="bg-navy/[0.72] border border-[#FF9B9B]/[0.45] rounded-full px-[18px] py-[9px] mx-8">
            <Typography className="text-[12.5px] font-semibold text-[#FF9B9B] text-center">
              {captureError}
            </Typography>
          </View>
        ) : null}
        <View className="flex-row items-center justify-center gap-[52px] w-full">
          {/*
            The left spacer was always a placeholder holding the shutter centred.
            The right one stays a spacer at the same 44x44 so it still is.

            `active:scale-95` sits on the Pressable unconditionally, present from
            the first render, and only a plain background alpha varies with
            `picking`. A class list that gains its first transform or shadow later
            makes NativeWind upgrade the component mid-life and throw a red screen
            about a missing navigation context — see AGENTS.md.
          */}
          <Pressable
            onPress={pickFromLibrary}
            disabled={busy}
            accessibilityLabel="Choose a saved photo"
            className="w-11 h-11 items-center justify-center active:scale-95"
          >
            <View
              className={`w-[38px] h-[38px] rounded-full border border-white/[0.14] items-center justify-center ${
                picking ? 'bg-navy/[0.30]' : 'bg-navy/[0.55]'
              }`}
            >
              <ImageIcon size={17} color="#fff" strokeWidth={1.75} />
            </View>
          </Pressable>
          <Pressable
            onPress={capture}
            disabled={busy}
            className="w-[76px] h-[76px] rounded-full bg-white/[0.10] border-[3px] border-white items-center justify-center active:scale-95"
          >
            <View className={`w-[60px] h-[60px] rounded-full ${busy ? 'bg-gold/[0.5]' : 'bg-gold'}`} />
          </Pressable>
          {/*
            Mirrors the gallery button on the left, so the shutter stays centred
            either way: 44x44 empty on the front step, the front photo itself
            once there is one.

            Every class here is fixed from the moment this mounts — the tick
            badge and the border do not appear later on an element that was
            already on screen. A className that gains its first transform or
            shadow mid-life is what makes NativeWind throw the bogus navigation
            error described in AGENTS.md.
          */}
          {hasFront ? (
            <Pressable
              onPress={retakeFront}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Front of the card captured. Tap to retake it."
              className="w-11 h-11 items-center justify-center active:scale-95"
            >
              <View className="w-[38px] h-[38px] rounded-[10px] overflow-hidden border border-white/[0.45]">
                <Image source={{ uri: frontImageUri }} className="w-full h-full" resizeMode="cover" />
              </View>
              <View className="absolute -top-[3px] -right-[3px] w-[17px] h-[17px] rounded-full bg-[#4ED17F] border-2 border-[#05070d] items-center justify-center">
                <CheckIcon size={9} color="#05070d" strokeWidth={3.4} />
              </View>
            </Pressable>
          ) : (
            <View className="w-11 h-11" />
          )}
        </View>
        {side === 'back' ? (
          <Pressable onPress={skipBack} disabled={busy}>
            <Typography className="text-[13px] font-bold text-gold">
              Skip the back &mdash; read the front
            </Typography>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.replace(isProfileScan ? '/(app)/card/edit' : '/(app)/capture/manual')}>
            <Typography className="text-[13px] font-semibold text-white/[0.80]">Enter manually instead</Typography>
          </Pressable>
        )}
      </View>
    </View>
  );
}
