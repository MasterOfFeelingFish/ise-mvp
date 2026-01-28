import { Suspense } from "react";
import TaskDetailClient from "./task-detail-client";

export default function TaskDetailPage() {
  return (
    <Suspense fallback={null}>
      <TaskDetailClient />
    </Suspense>
  );
}
