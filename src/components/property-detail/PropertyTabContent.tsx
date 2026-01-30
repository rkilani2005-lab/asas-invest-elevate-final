import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface PropertyTabContentProps {
  activeTab: string;
  tabId: string;
  children: ReactNode;
}

const PropertyTabContent = ({ activeTab, tabId, children }: PropertyTabContentProps) => {
  if (activeTab !== tabId) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabId}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PropertyTabContent;
