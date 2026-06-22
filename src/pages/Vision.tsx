import VisionHero from "@/components/vision/VisionHero";
import VisionPillars from "@/components/vision/VisionPillars";
import FeatureShowcase from "@/components/vision/FeatureShowcase";
import AgentGallery from "@/components/vision/AgentGallery";
import AgentExamples from "@/components/vision/AgentExamples";
import ImpactMetrics from "@/components/vision/ImpactMetrics";

const Vision = () => {
  return (
    <div className="py-8 space-y-16">
      <VisionHero />
      <VisionPillars />
      <FeatureShowcase />
      <AgentGallery />
      <AgentExamples />
      <ImpactMetrics />
    </div>
  );
};

export default Vision;
