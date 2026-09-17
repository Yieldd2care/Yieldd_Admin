import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import { Typography } from '../../../components/ui/Typography';
import { CheckIcon, CloseIcon, FlashIcon, ImageIcon, KeyboardIcon } from '../../../components/ui/icons';
import { RadialGlow } from '../../../components/ui/RadialGlow';
import { GUIDE_BOX, cropToGuideBox, normaliseCardPhoto } from '../../../lib/cardPhoto';
import { persistCapture } from '../../../lib/captureFiles';
import { useCaptureDraftStore } from '../../../stores/useCaptureDraftStore';
import { primeCaptureLocation } from '../../../lib/location';
import { CaptureLocationNotice } from '../../../components/capture/CaptureLocationNotice';

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
  // The guide box is a fixed size in dp; the crop needs to know how much
  // of the frame that box covers, which depends on the screen it is on.
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
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

  const goToDetails = () => {
    // The business-card scan is a different feature and keeps its own screen.
    if (isProfileScan) {
      router.push('/(app)/card/scan-confirm');
      return;
    }
    // `replace`, not `push`: Back from the details screen should leave the
    // flow, not drop the rep onto a live camera holding a photo they have
    // already moved past.
    router.replace('/(app)/capture/details');
  };

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
        setImageUri(await persistCapture(photo.uri, 'front.jpg'));
        setBackImageUri(null);
        setSide('back');
        return;
      }

      setBackImageUri(await persistCapture(photo.uri, 'back.jpg'));
      goToDetails();
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
        // Cut down to what the rep framed before anything else touches it, so
        // the durable copy, the preview and the card reader all see the card
        // rather than the floor around it.
        const front = await cropToGuideBox(
          photo.uri,
          photo.width,
          photo.height,
          screenWidth,
          screenHeight
        );
        setImageUri(await persistCapture(front, 'front.jpg'));
        setBackImageUri(null);
        setSide('back');
        return;
      }

      if (photo) {
        const back = await cropToGuideBox(
          photo.uri,
          photo.width,
          photo.height,
          screenWidth,
          screenHeight
        );
        setBackImageUri(await persistCapture(back, 'back.jpg'));
      }
      goToDetails();
    } finally {
      setCapturing(false);
    }
  };

  const skipBack = () => {
    setBackImageUri(null);
    goToDetails();
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
  /**
   * Start looking for the device's position, and carry straight on.
   *
   * Here rather than in the details screen for two reasons. The first is time:
   * the rep still has a card to photograph, maybe two sides of it, and a form
   * to fill, which is the difference between a fix that is waiting when they
   * press save and one that is not. The second is that the details screen is a
   * ScrollView of TextInputs, and AGENTS.md is explicit that a location watch
   * does not belong on a screen like that.
   *
   * Gated on the camera permission having already been granted, so the two
   * prompts arrive one after the other on a first capture instead of stacking
   * on top of each other. `primeCaptureLocation` sets no state and subscribes
   * to nothing - it is one read, fired and forgotten - so this effect can never
   * re-render anything.
   */
  useEffect(() => {
    if (permission?.granted) primeCaptureLocation();
  }, [permission?.granted]);

  /**
   * When the location disclosure may appear.
   *
   * Two separate guards, both load-bearing.
   *
   * The permission half keeps two dialogs from stacking: either the camera is
   * granted and its prompt is behind us, or the OS has stopped offering one, in
   * which case nothing can arrive on top of ours. `canAskAgain` counts as ready
   * because the branch below is a live capture route - the rep can still work
   * from saved photos - and gating on `granted` alone would leave anyone who
   * turned the camera off unable to reach this at all.
   *
   * The profile half keeps it off the wrong feature entirely. `mode=profile` is
   * the rep photographing their OWN card, which goes to the card editor and
   * creates no lead and reads no location. Showing a location disclosure there
   * would spend the one-time explanation on a flow it does not describe.
   */
  const locationNoticeReady =
    !isProfileScan && permission != null && (permission.granted || !permission.canAskAgain);

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
      <>
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
              Skip the back and read the front
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
      {/* A sibling of that View rather than a child of it: the column above is
          a NativeWind gap- container, which would reserve a gap for a Modal
          that draws nothing inline. This branch still reaches a saved lead
          through the photo picker, so it needs the disclosure as much as the
          live camera does. */}
      <CaptureLocationNotice enabled={locationNoticeReady} />
      </>
    );
  }

  return (
    <View className="flex-1 bg-[#05070d]">
      <CameraView ref={cameraRef} style={{ flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} facing="back" flash={flashOn ? 'on' : 'off'} />
      <RadialGlow color="#1D3F8A" size={600} style={{ top: -180, left: 30, opacity: 0.3 }} />

      <View className="flex-1 items-center justify-center">
        {/* GUIDE_BOX, not literals: lib/cardPhoto.ts crops the captured frame
            to exactly this rectangle, and two copies of the numbers would let
            the cut drift away from what the rep aimed with. */}
        <View style={{ width: GUIDE_BOX.width, height: GUIDE_BOX.height, position: 'relative' }}>
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
                ? 'Front captured, now the back or skip'
                : 'Now the back, or skip if it is blank'}
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
        {/*
          Above the shutter, not below it.

          This is the one control on the screen a rep reaches for mid-stride -
          most cards have nothing on the back - and under the shutter it sat in
          the strip of screen a thumb has to stretch past the capture button to
          reach. Directly above it, it is the nearest thing to the thumb after
          the shutter itself.

          Only on the back step: there is nothing to skip before a front exists.
        */}
        {side === 'back' ? (
          <Pressable
            onPress={skipBack}
            disabled={busy}
            hitSlop={10}
            className="bg-navy/[0.55] border border-white/[0.14] rounded-full px-5 py-[10px] active:scale-95"
          >
            <Typography className="text-[13px] font-bold text-gold">
              Skip the back and read the front
            </Typography>
          </Pressable>
        ) : null}

        {/*
          Three slots, and the two either side of the shutter are LABELLED.

          They were icon-only, which reads fine to whoever built the screen and
          not at all to a rep on their first morning: a pencil beside a shutter
          looks like "edit the photo", not "type it in instead". This is the
          first screen a new person meets, and the capture button is the only
          thing on it that explains itself.

          Each side slot is a fixed 70 wide so the shutter stays centred by
          construction, and every class here is static from first render - a
          className that gains its first transform or shadow later is what makes
          NativeWind throw the bogus navigation error described in AGENTS.md.
        */}
        <View className="flex-row items-center justify-center gap-[30px] w-full">
          <Pressable
            onPress={pickFromLibrary}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Choose a saved photo"
            className="w-[70px] items-center gap-[6px] active:scale-95"
          >
            <View
              className={`w-[38px] h-[38px] rounded-full border border-white/[0.14] items-center justify-center ${
                picking ? 'bg-navy/[0.30]' : 'bg-navy/[0.55]'
              }`}
            >
              <ImageIcon size={17} color="#fff" strokeWidth={1.75} />
            </View>
            <Typography className="text-[10px] font-semibold text-white/[0.75]">Gallery</Typography>
          </Pressable>

          <Pressable
            onPress={capture}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Take the photo"
            className="w-[76px] h-[76px] rounded-full bg-white/[0.10] border-[3px] border-white items-center justify-center active:scale-95"
          >
            <View className={`w-[60px] h-[60px] rounded-full ${busy ? 'bg-gold/[0.5]' : 'bg-gold'}`} />
          </Pressable>

          {hasFront ? (
            <Pressable
              onPress={retakeFront}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Front of the card captured. Tap to retake it."
              className="w-[70px] items-center gap-[6px] active:scale-95"
            >
              {/* The tick is positioned against THIS 38x38 box, not the 70-wide
                  column, or it would drift out to the edge of the label. */}
              <View className="w-[38px] h-[38px] relative">
                <View className="w-[38px] h-[38px] rounded-[10px] overflow-hidden border border-white/[0.45]">
                  <Image source={{ uri: frontImageUri }} className="w-full h-full" resizeMode="cover" />
                </View>
                <View className="absolute -top-[3px] -right-[3px] w-[17px] h-[17px] rounded-full bg-[#4ED17F] border-2 border-[#05070d] items-center justify-center">
                  <CheckIcon size={9} color="#05070d" strokeWidth={3.4} />
                </View>
              </View>
              <Typography className="text-[10px] font-semibold text-white/[0.75]">Retake</Typography>
            </Pressable>
          ) : (
            <Pressable
              onPress={() =>
                router.replace(isProfileScan ? '/(app)/card/edit' : '/(app)/capture/manual')
              }
              accessibilityRole="button"
              accessibilityLabel="Type the details in instead of photographing a card"
              className="w-[70px] items-center gap-[6px] active:scale-95"
            >
              <View className="w-[38px] h-[38px] rounded-full bg-navy/[0.55] border border-white/[0.14] items-center justify-center">
                <KeyboardIcon size={17} color="#fff" strokeWidth={1.9} />
              </View>
              <Typography className="text-[10px] font-semibold text-white/[0.75]">Type it in</Typography>
            </Pressable>
          )}
        </View>
      </View>

      <CaptureLocationNotice enabled={locationNoticeReady} />
    </View>
  );
}
