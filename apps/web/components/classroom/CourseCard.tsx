"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Clock, BookOpen, Play, Lock } from "lucide-react";
import { Card, CardContent, CardFooter } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import type { Course } from "shared-types";

interface CourseCardProps {
  course: Course;
}

const levelLabels: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

export function CourseCard({ course }: CourseCardProps) {
  const progress =
    course.total_lessons > 0
      ? Math.round((course.completed_lessons / course.total_lessons) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2 }}
    >
      <Link href={`/classroom/${course.slug}`}>
        <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer h-full flex flex-col">
          <div className="relative aspect-video bg-secondary/10">
            {course.thumbnail_url ? (
              <Image
                src={course.thumbnail_url}
                alt={course.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-muted-foreground/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            {course.is_free ? (
              <Badge className="absolute top-2 left-2 bg-green-500 text-white border-0">
                Grátis
              </Badge>
            ) : (
              <div className="absolute top-2 right-2">
                <Lock className="h-4 w-4 text-white" />
              </div>
            )}
            {progress > 0 && progress < 100 && (
              <Badge className="absolute bottom-2 right-2 bg-primary/90 text-white border-0">
                <Play className="h-3 w-3 mr-1" />
                Em andamento
              </Badge>
            )}
            {progress === 100 && (
              <Badge className="absolute bottom-2 right-2 bg-green-500/90 text-white border-0">
                Concluído
              </Badge>
            )}
          </div>

          <CardContent className="flex-1 pt-4">
            <h3 className="font-display font-bold text-base leading-snug mb-1 line-clamp-2">
              {course.title}
            </h3>
            {course.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {course.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {course.level && (
                <Badge variant="outline" className="text-xs">
                  {levelLabels[course.level] ?? course.level}
                </Badge>
              )}
              {course.estimated_hours && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {course.estimated_hours}h
                </span>
              )}
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {course.total_lessons} aulas
              </span>
            </div>
          </CardContent>

          {progress > 0 && (
            <CardFooter className="pt-0 pb-4 flex-col items-start gap-1">
              <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                <span>Progresso</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5 w-full" />
            </CardFooter>
          )}
        </Card>
      </Link>
    </motion.div>
  );
}
