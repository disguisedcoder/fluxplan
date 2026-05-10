-- Optional FK: App-Daten werden der aktuellen StudySession zugeordnet; Reset betrifft nur diese Session.
ALTER TABLE "Task" ADD COLUMN "studySessionId" TEXT;
ALTER TABLE "TaskInteraction" ADD COLUMN "studySessionId" TEXT;
ALTER TABLE "AdaptiveSuggestion" ADD COLUMN "studySessionId" TEXT;

CREATE INDEX "Task_userId_studySessionId_idx" ON "Task"("userId", "studySessionId");
CREATE INDEX "TaskInteraction_userId_studySessionId_idx" ON "TaskInteraction"("userId", "studySessionId");
CREATE INDEX "AdaptiveSuggestion_userId_studySessionId_idx" ON "AdaptiveSuggestion"("userId", "studySessionId");

ALTER TABLE "Task" ADD CONSTRAINT "Task_studySessionId_fkey" FOREIGN KEY ("studySessionId") REFERENCES "StudySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskInteraction" ADD CONSTRAINT "TaskInteraction_studySessionId_fkey" FOREIGN KEY ("studySessionId") REFERENCES "StudySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdaptiveSuggestion" ADD CONSTRAINT "AdaptiveSuggestion_studySessionId_fkey" FOREIGN KEY ("studySessionId") REFERENCES "StudySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
