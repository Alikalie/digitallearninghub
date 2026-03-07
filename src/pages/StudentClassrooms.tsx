import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Search, Users, BookOpen, Loader2, LogIn,
} from "lucide-react";

interface ClassroomWithMeta {
  id: string;
  name: string;
  classroom_code: string;
  description: string | null;
  is_active: boolean;
  member_count?: number;
  tutor_name?: string;
  is_joined?: boolean;
}

export default function StudentClassrooms() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myClassrooms, setMyClassrooms] = useState<ClassroomWithMeta[]>([]);
  const [allClassrooms, setAllClassrooms] = useState<ClassroomWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);

    // My memberships
    const { data: memberships } = await supabase
      .from("classroom_members")
      .select("classroom_id")
      .eq("user_id", user!.id);
    const myIds = new Set((memberships || []).map((m) => m.classroom_id));

    // All active classrooms
    const { data: rooms } = await supabase
      .from("classrooms")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (rooms) {
      const enriched = await Promise.all(
        rooms.map(async (r) => {
          const { count } = await supabase
            .from("classroom_members")
            .select("*", { count: "exact", head: true })
            .eq("classroom_id", r.id);
          const { data: tutorProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", r.tutor_id)
            .single();
          return {
            ...r,
            member_count: count || 0,
            tutor_name: tutorProfile?.full_name || "Unknown Tutor",
            is_joined: myIds.has(r.id) || r.tutor_id === user!.id,
          };
        })
      );
      setMyClassrooms(enriched.filter((r) => r.is_joined));
      setAllClassrooms(enriched.filter((r) => !r.is_joined));
    }
    setLoading(false);
  };

  const joinByCode = async () => {
    if (!joinCode.trim()) {
      toast.error("Please enter a classroom code");
      return;
    }
    setJoining(true);
    const { data: room } = await supabase
      .from("classrooms")
      .select("id")
      .eq("classroom_code", joinCode.trim().toLowerCase())
      .eq("is_active", true)
      .single();
    if (!room) {
      toast.error("Invalid classroom code");
      setJoining(false);
      return;
    }
    const { error } = await supabase.from("classroom_members").insert({
      classroom_id: room.id,
      user_id: user!.id,
    });
    if (error) {
      toast.error(error.message.includes("unique") ? "Already a member" : "Failed to join");
    } else {
      toast.success("Joined classroom!");
      setJoinCode("");
      loadData();
    }
    setJoining(false);
  };

  const joinClassroom = async (classroomId: string) => {
    const { error } = await supabase.from("classroom_members").insert({
      classroom_id: classroomId,
      user_id: user!.id,
    });
    if (error) {
      toast.error(error.message.includes("unique") ? "Already a member" : "Failed to join");
      return;
    }
    toast.success("Joined classroom!");
    loadData();
  };

  const filtered = allClassrooms.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" size={32} /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-2">Classrooms</h1>
          <p className="text-muted-foreground text-sm">Join study classrooms and learn with peers</p>
        </motion.div>

        {/* Join by code */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="dlh-card p-4">
          <p className="font-medium text-sm mb-2">Have a classroom code?</p>
          <div className="flex gap-2">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter code (e.g. abc12345)"
              className="font-mono"
              onKeyDown={(e) => e.key === "Enter" && joinByCode()}
            />
            <Button onClick={joinByCode} disabled={joining} className="bg-gradient-primary flex-shrink-0">
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogIn className="mr-2 h-4 w-4" />Join</>}
            </Button>
          </div>
        </motion.div>

        <Tabs defaultValue="my">
          <TabsList>
            <TabsTrigger value="my">My Classrooms ({myClassrooms.length})</TabsTrigger>
            <TabsTrigger value="browse">Browse All</TabsTrigger>
          </TabsList>

          <TabsContent value="my" className="mt-4">
            {myClassrooms.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="mx-auto mb-4 text-muted-foreground" size={48} />
                <p className="text-muted-foreground">You haven't joined any classrooms yet</p>
                <p className="text-sm text-muted-foreground">Enter a code above or browse available classrooms</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {myClassrooms.map((room, i) => (
                  <motion.div key={room.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/classroom/${room.id}`)}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{room.name}</CardTitle>
                        {room.description && <p className="text-sm text-muted-foreground line-clamp-2">{room.description}</p>}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>By {room.tutor_name}</span>
                          <span className="flex items-center gap-1"><Users size={14} />{room.member_count}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="browse" className="mt-4 space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search classrooms..." className="pl-10" />
            </div>
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No classrooms found</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {filtered.map((room, i) => (
                  <motion.div key={room.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{room.name}</CardTitle>
                          <Badge variant="outline" className="text-xs">Open</Badge>
                        </div>
                        {room.description && <p className="text-sm text-muted-foreground line-clamp-2">{room.description}</p>}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">By {room.tutor_name}</span>
                          <Button size="sm" onClick={() => joinClassroom(room.id)} className="bg-gradient-primary">Join</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
