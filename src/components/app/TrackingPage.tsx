import { useState } from "react";
import { motion } from "framer-motion";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Moon, Footprints } from "lucide-react";
import SleepTracker from "./SleepTracker";
import ActivityTracker from "./ActivityTracker";

interface TrackingPageProps {
  user: User;
}

const TrackingPage = ({ user }: TrackingPageProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 px-6 py-6 pb-24"
    >
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-light text-[#2F2A33] mb-6">
          Seguimiento
        </h1>

        <Tabs defaultValue="sleep" className="w-full">
          <TabsList className="w-full bg-white border-0">
            <TabsTrigger
              value="sleep"
              className="flex-1 text-[#2F2A33]/60 data-[state=active]:bg-[#F5E6D3] data-[state=active]:text-[#A799B7]"
            >
              <Moon className="w-4 h-4 mr-2" />
              Sueño
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="flex-1 text-[#2F2A33]/60 data-[state=active]:bg-[#F5E6D3] data-[state=active]:text-[#A799B7]"
            >
              <Footprints className="w-4 h-4 mr-2" />
              Actividad
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sleep">
            <SleepTracker user={user} />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTracker user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
};

export default TrackingPage;
