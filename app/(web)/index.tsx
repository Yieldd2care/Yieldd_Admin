import { useRef } from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function LandingScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});

  const registerSection = (key: string) => (e: LayoutChangeEvent) => {
    offsets.current[key] = e.nativeEvent.layout.y;
  };

  const scrollToSection = (key: string) => {
    const y = offsets.current[key];
    if (y != null) {
      scrollRef.current?.scrollTo({ y, animated: true });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top']}>
      <WebNav onNavigate={scrollToSection} />
      <ScrollView ref={scrollRef} className="flex-1" showsVerticalScrollIndicator={false}>
        <View onLayout={registerSection('top')}>
          <Hero />
        </View>
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
    </SafeAreaView>
  );
}
