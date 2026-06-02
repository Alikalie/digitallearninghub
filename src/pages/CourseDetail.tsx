import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, BookOpen, MessageSquare, Clock, Users, Star, CheckCircle, Loader2 } from "lucide-react";
import { DLH_COURSES } from "@/lib/courses";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LessonVideoPlayer } from "@/components/course/LessonVideoPlayer";

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  transcript: string | null;
  order_index: number;
}

export default function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dbCourse, setDbCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [videosEnabled, setVideosEnabled] = useState(false);

  const staticCourse = DLH_COURSES.find((c) => c.id === courseId);

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    const { data: settingsData } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "videos_enabled")
      .single();
    setVideosEnabled(settingsData?.value === true);

    if (!staticCourse) {
      const { data } = await supabase.from("courses").select("*").eq("id", courseId!).single();
      setDbCourse(data);
    }

    let courseDbId = courseId;
    if (staticCourse) {
      const { data: matchedCourse } = await supabase
        .from("courses")
        .select("id")
        .eq("title", staticCourse.title)
        .single();
      if (matchedCourse) courseDbId = matchedCourse.id;
    }

    const { data: lessonData } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseDbId!)
      .order("order_index", { ascending: true });
    setLessons((lessonData as Lesson[]) || []);

    if (user && lessonData && lessonData.length > 0) {
      const lessonIds = lessonData.map((l) => l.id);
      const { data: progressData } = await supabase
        .from("course_progress")
        .select("lesson_id")
        .eq("completed", true)
        .in("lesson_id", lessonIds);
      setCompletedLessons(new Set((progressData || []).map((p) => p.lesson_id)));
    }

    setLoading(false);
  };

  const markLessonComplete = useCallback(async (lessonId: string) => {
    if (!user) return;
    await supabase.from("course_progress").upsert({
      user_id: user.id,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    });
    setCompletedLessons((prev) => new Set([...prev, lessonId]));
  }, [user]);

  const toggleLessonComplete = async (lessonId: string) => {
    if (!user) return;
    const isCompleted = completedLessons.has(lessonId);

    if (isCompleted) {
      await supabase
        .from("course_progress")
        .update({ completed: false, completed_at: null })
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId);
      setCompletedLessons((prev) => {
        const n = new Set(prev);
        n.delete(lessonId);
        return n;
      });
    } else {
      await markLessonComplete(lessonId);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  const course = staticCourse
    ? staticCourse
    : dbCourse
    ? { id: dbCourse.id, title: dbCourse.title, description: dbCourse.description || "", category: dbCourse.category || "Other", image_url: dbCourse.image_url || "", topics: [] as string[] }
    : null;

  const matchedStatic = dbCourse ? DLH_COURSES.find((c) => c.title.toLowerCase() === dbCourse.title?.toLowerCase()) : null;
  const topics = staticCourse?.topics || matchedStatic?.topics || [];
  const chatCourseId = staticCourse?.id || matchedStatic?.id || courseId;
  const progressPercent = lessons.length > 0 ? Math.round((completedLessons.size / lessons.length) * 100) : 0;

  if (!course) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <BookOpen className="mx-auto mb-4 text-muted-foreground" size={48} />
          <h2 className="text-xl font-semibold mb-2">Course not found</h2>
          <Button onClick={() => navigate("/courses")}>Back to Courses</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 max-w-4xl mx-auto pb-20">
        <Button variant="ghost" onClick={() => navigate("/courses")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Courses
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {course.image_url && (
            <div className="aspect-video rounded-2xl overflow-hidden bg-muted mb-8">
              <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Badge className="bg-gradient-primary text-primary-foreground">{course.category}</Badge>
            <div className="flex items-center gap-1 text-dlh-warning">
              <Star size={14} fill="currentColor" />
              <span className="text-sm font-medium">4.8</span>
            </div>
            <span className="flex items-center gap-1 text-sm text-muted-foreground"><Clock size={14} />Self-paced</span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground"><Users size={14} />Open Enrollment</span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-bold mb-4">{course.title}</h1>
          <p className="text-muted-foreground mb-8">{course.description}</p>

          {lessons.length > 0 && (
            <div className="bg-gradient-to-br from-primary to-accent rounded-2xl p-5 mb-6 text-primary-foreground shadow-lg">
              <div className="text-[11px] font-bold uppercase tracking-widest opacity-80 mb-1">Your Course Progress</div>
              <div className="flex items-center gap-4">
                {/* Circular ring */}
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg width="64" height="64" className="-rotate-90">
                    <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="5" />
                    <circle
                      cx="32"
                      cy="32"
                      r="27"
                      fill="none"
                      stroke="white"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 27}
                      strokeDashoffset={2 * Math.PI * 27 - (progressPercent / 100) * 2 * Math.PI * 27}
                      style={{ transition: "stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                    {progressPercent}%
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-2xl leading-none mb-1">{completedLessons.size} / {lessons.length}</div>
                  <div className="text-xs opacity-80 mb-2">lessons completed</div>
                  <div className="h-1.5 rounded-full bg-white/25 overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-700"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {topics.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4">What You'll Learn</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {topics.map((topic) => (
                  <div key={topic} className="flex items-center gap-3">
                    <CheckCircle className="text-dlh-teal flex-shrink-0" size={18} />
                    <span className="text-sm">{topic}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lessons.length > 0 && (
            <div className="space-y-4 mb-8">
              <h2 className="text-lg font-semibold">Lessons</h2>
              {lessons.map((lesson, i) => {
                const isCompleted = completedLessons.has(lesson.id);
                return (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`dlh-card p-4 space-y-3 transition-all ${isCompleted ? "border-emerald-500/40 ring-1 ring-emerald-500/20" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleLessonComplete(lesson.id)}
                        className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                          isCompleted
                            ? "bg-emerald-500 text-white shadow-md"
                            : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                        }`}
                        aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
                      >
                        {isCompleted ? <CheckCircle size={16} /> : <span className="text-[11px] font-bold">{i + 1}</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold ${isCompleted ? "text-muted-foreground" : ""}`}>
                          {lesson.title}
                        </h3>
                        {lesson.content && (
                          <p className="text-sm text-muted-foreground mt-1">{lesson.content}</p>
                        )}
                      </div>
                      {isCompleted && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-full">
                          Completed
                        </span>
                      )}
                    </div>

                    {videosEnabled && lesson.video_url && (
                      <LessonVideoPlayer
                        lessonId={lesson.id}
                        videoUrl={lesson.video_url}
                        title={lesson.title}
                        transcript={lesson.transcript}
                        isCompleted={isCompleted}
                        onAutoComplete={markLessonComplete}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              className="bg-gradient-primary hover:opacity-90 flex-1"
              onClick={() => navigate(`/chat?course=${chatCourseId}`)}
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              Start Learning with AI Tutor
            </Button>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
