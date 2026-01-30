import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface PropertyTabContentProps {
  activeTab: string;
  tabId: string;
  children: ReactNode;
}

const PropertyTabContent = ({ activeTab, tabId, children }: PropertyTabContentProps) => {
  return (
    <AnimatePresence mode="wait">
      {activeTab === tabId && (
        <motion.div
          key={tabId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PropertyTabContent;
