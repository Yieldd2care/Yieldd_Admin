import { useRef } from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';

import { WebNav } from '../../components/web/WebNav';
import { Hero } from '../../components/web/Hero';
import { StatStrip } from '../../components/web/StatStrip';
import { ProblemSection } from '../../components/web/ProblemSection';
import { HowItWorks } from '../../components/web/HowItWorks';
import { FeatureQuad } from '../../components/web/FeatureQuad';
import { ROISection } from '../../components/web/ROISection';
import { IndustryGrid } from '../../components/web/IndustryGrid';
import { FAQAccordion } from '../../components/web/FAQAccordion';
import { CTABanner } from '../../components/web/CTABanner';
import { WebFooter } from '../../components/web/WebFooter';

/**
 * yieldd.co.
 *
 * The header is painted AFTER the ScrollView, in a click-through absolute
 * wrapper, so the hero scrolls up beneath the floating pill. Two details make
 * that work:
 *
 *   - Painting it last puts it on top without needing a z-index, and keeps it
 *     out of the scroller's flow so it no longer consumes 94px of layout
 *     height the way a sibling above the ScrollView did.
 *   - `pointerEvents="box-none"` lets clicks through the empty area around the
 *     pill to the page underneath, which is the reference's click-through
 *     header wrapper exactly. The wrapper has no fixed height, so the mobile
 *     drawer can open to whatever height it needs without being clipped.
 *
 * There is no SafeAreaView here any more. A browser has no notch, and the top
 * inset stopped the hero ever reaching y=0, which broke the tuck-under.
 *
 * Section offsets are measured with onLayout for the nav's scroll targets.
 * Those handlers must stay on a section's own outermost view — never on a
 * <Reveal>, which translates its child and would report a shifted y.
 */
export default function LandingScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});

  const registerSection = (key: string) => (e: LayoutChangeEvent) => {
    offsets.current[key] = e.nativeEvent.layout.y;
  };

  const scrollToSection = (key: string) => {
    const y = offsets.current[key];
    if (y != null) {
      // Land just below the floating header rather than flush with the
      // section's top edge, or the heading hides behind the pill.
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 88), animated: true });
    }
  };

  return (
    <View className="flex-1 bg-navy">
      <ScrollView ref={scrollRef} className="flex-1" showsVerticalScrollIndicator={false}>
        <Hero onLayout={registerSection('top')} onNavigate={scrollToSection} />
        <StatStrip />
        <ProblemSection />
        <HowItWorks onLayout={registerSection('how')} />
        <FeatureQuad onLayout={registerSection('features')} />
        <ROISection onLayout={registerSection('roi')} />
        <IndustryGrid onLayout={registerSection('industries')} />
        <FAQAccordion onLayout={registerSection('faq')} />
        <CTABanner />
        <WebFooter onLogoPress={() => scrollToSection('top')} />
      </ScrollView>

      <View pointerEvents="box-none" className="absolute top-0 left-0 right-0">
        <WebNav onNavigate={scrollToSection} />
      </View>
    </View>
  );
}
