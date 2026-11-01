// extracted while the shape was still moving
export async function dueMeetings(ownerEmail: string, now = Date.now()) {
  const db = getDb();
  const [due, [next]] = await Promise.all([
    db
      .select({ id: meetings.id, meetUrl: meetings.meetUrl })
      .from(meetings)
      .where(
        and(
          eq(meetings.ownerEmail, ownerEmail),
          eq(meetings.status, "draft"),
          between(
            meetings.startsAt,
            new Date(now - JOIN_LATE_MS).toISOString(),
            new Date(now + JOIN_EARLY_MS).toISOString(),
          ),
        ),
      ),
    db
      .select({ startsAt: meetings.startsAt })
      .from(meetings)
      .where(
        and(
          eq(meetings.ownerEmail, ownerEmail),
          eq(meetings.status, "draft"),
          gt(meetings.startsAt, new Date(now).toISOString()),
        ),
      )
      .orderBy(asc(meetings.startsAt))
      .limit(1),
  ]);
  return { due, nextStartsAt: next?.startsAt ?? null };
}

export function leaveAt(meeting: Meeting) {
  const start = Date.parse(
    meeting.startsAt ?? meeting.startedAt ?? meeting.createdAt,
  );
  return new Date(
    start + meeting.durationMinutes * MINUTE_MS + LEAVE_GRACE_MS,
  ).toISOString();
}

export async function startMeeting(ownerEmail: string, id: string) {
  const [started] = await getDb()
    .update(meetings)
    .set({
      status: meetingMachine.transition("draft", "start"),
      startedAt: isoNow(),
    })
    .where(
      and(
        eq(meetings.id, id),
        eq(meetings.ownerEmail, ownerEmail),
        inArray(meetings.status, meetingMachine.fromStates("start")),
      ),
    )
    .returning();
  if (started) return true;
  const meeting = await getMeeting(ownerEmail, id);
  if (meeting.status === "live") return false;
  return conflict("This meeting has already ended.");
}

export async function finishMeeting(ownerEmail: string, id: string) {
  const [finished] = await getDb()
    .update(meetings)
    .set({
      status: meetingMachine.transition("live", "finish"),
      endedAt: isoNow(),
    })
    .where(
      and(
        eq(meetings.id, id),
        eq(meetings.ownerEmail, ownerEmail),
        inArray(meetings.status, meetingMachine.fromStates("finish")),
      ),
    )
    .returning();
  if (finished) return true;
  const meeting = await getMeeting(ownerEmail, id);
  if (meeting.status !== "ended") conflict("This meeting hasn't started.");
  return false;
}

export async function requireLiveMeeting(ownerEmail: string, id: string) {
  const meeting = await getMeeting(ownerEmail, id);
  if (meetingMachine.parseState(meeting.status) !== "live") {
    conflict("This meeting isn't live.");
  }
  return meeting;
}

export async function requireJoinableMeeting(ownerEmail: string, id: string) {
  const meeting = await getMeeting(ownerEmail, id);
  if (meetingMachine.parseState(meeting.status) === "ended") {
    conflict("This call has already ended.");
  }
  return meeting;
}

export async function appendTranscriptLine(
  meeting: Meeting,
  speaker: string,
  body: string,
) {
  const id = newId();
  await getDb().insert(transcriptSegments).values({
    id,
    meetingId: meeting.id,
    ownerEmail: meeting.ownerEmail,
    speaker,
    body,
    spokenAt: isoNow(),
  });
  return id;
}

export async function heardAnyone(meetingId: string) {
  const [line] = await getDb()
    .select({ id: transcriptSegments.id })
    .from(transcriptSegments)
    .where(
      and(
        eq(transcriptSegments.meetingId, meetingId),
        ne(transcriptSegments.speaker, STAND_IN_SPEAKER),
      ),
    )
    .limit(1);
  return Boolean(line);
}

export const recentTranscript = (meetingId: string, limit: number) =>
  getDb()
    .select()
    .from(transcriptSegments)
    .where(eq(transcriptSegments.meetingId, meetingId))
    .orderBy(desc(transcriptSegments.spokenAt))
    .limit(limit);

export async function queueLine(meeting: Meeting, body: string) {
  await getDb().insert(utterances).values({
    id: newId(),
    meetingId: meeting.id,
    ownerEmail: meeting.ownerEmail,
    body,
    createdAt: isoNow(),
  });
}

export async function claimNextLine(meeting: Meeting) {
  const db = getDb();
  const [next] = await db
    .select({ id: utterances.id })
    .from(utterances)
    .where(
      and(
        eq(utterances.meetingId, meeting.id),
        eq(utterances.status, "queued"),
        lt(utterances.attempts, MAX_SPEAK_ATTEMPTS),
      ),
    )
    .orderBy(asc(utterances.createdAt))
    .limit(1);
  if (!next) return null;
  const spokenAt = isoNow();
  const [claimed] = await db
    .update(utterances)
    .set({ status: "spoken", spokenAt })
    .where(and(eq(utterances.id, next.id), eq(utterances.status, "queued")))
    .returning();
  if (!claimed) return null;
  const transcriptId = newId();
  await db.insert(transcriptSegments).values({
    id: transcriptId,
    meetingId: meeting.id,
    ownerEmail: meeting.ownerEmail,
    speaker: STAND_IN_SPEAKER,
    body: claimed.body,
    spokenAt,
  });
  return { ...claimed, transcriptId };
}

type ClaimedLine = NonNullable<Awaited<ReturnType<typeof claimNextLine>>>;

export async function releaseLine({ id, transcriptId }: ClaimedLine) {
  const db = getDb();
  await db
    .update(utterances)
    .set({
      status: "queued",
      spokenAt: null,
      attempts: sql`${utterances.attempts} + 1`,
    })
    .where(and(eq(utterances.id, id), eq(utterances.status, "spoken")));
  await db
    .delete(transcriptSegments)
    .where(eq(transcriptSegments.id, transcriptId));
}

export async function createQuestion(
  meeting: Meeting,
  askedBy: string,
  body: string,
  suggestedReplies: string[],
) {
  await getDb()
    .insert(questions)
    .values({
      id: newId(),
      meetingId: meeting.id,
      ownerEmail: meeting.ownerEmail,
      askedBy,
      body,
      suggestedRepliesJson: JSON.stringify(suggestedReplies),
      createdAt: isoNow(),
    });
}

export async function answerQuestion(
  ownerEmail: string,
  id: string,
  answer: string,
) {
  const [answered] = await getDb()
    .update(questions)
    .set({ status: "answered", answer, answeredAt: isoNow() })
    .where(
      and(
        eq(questions.id, id),
        eq(questions.ownerEmail, ownerEmail),
        eq(questions.status, "pending"),
      ),
    )
    .returning();
  if (answered) return answered;
  const [existing] = await getDb()
    .select({ id: questions.id })
    .from(questions)
    .where(and(eq(questions.id, id), eq(questions.ownerEmail, ownerEmail)));
  return existing
    ? conflict("That question is already answered.")
    : notFound("Question");
}

export async function listFollowUps(
  ownerEmail: string,
  { limit = DEFAULT_PAGE_SIZE, offset = 0 }: PageRequest = {},
) {
  const rows = await getDb()
    .select({
      id: questions.id,
      meetingId: questions.meetingId,
      meetingTitle: meetings.title,
      askedBy: questions.askedBy,
      body: questions.body,
      createdAt: questions.createdAt,
    })
    .from(questions)
    .innerJoin(meetings, eq(meetings.id, questions.meetingId))
    .where(
      and(
        eq(questions.ownerEmail, ownerEmail),
        eq(meetings.ownerEmail, ownerEmail),
        eq(questions.status, "pending"),
        eq(meetings.status, "ended"),
      ),
    )
    .orderBy(desc(questions.createdAt), desc(questions.id))
    .limit(limit + 1)
    .offset(offset);
  return { followUps: rows.slice(0, limit), hasMore: rows.length > limit };
}

export async function saveNotes(
  ownerEmail: string,
  id: string,
  notes: string,
  items: { body: string; assignee?: string | undefined }[],
) {
  const meeting = await getMeeting(ownerEmail, id);
  await getDb().transaction(async (tx) => {
    await tx
      .update(meetings)
      .set({ notes })
      .where(and(eq(meetings.id, id), eq(meetings.ownerEmail, ownerEmail)));
    await tx.delete(actionItems).where(eq(actionItems.meetingId, id));
    if (items.length > 0) {
      await tx.insert(actionItems).values(
        items.map((item, sortOrder) => ({
          id: newId(),
          meetingId: id,
          ownerEmail,
          body: item.body,
          assignee: item.assignee ?? null,
          sortOrder,
        })),
      );
    }
  });
  return meeting;
}

export async function updateActionItem(
  ownerEmail: string,
  id: string,
  {
    event,
    ...fields
  }: {
    body?: string | undefined;
    assignee?: string | undefined;
    event?: ActionItemEvent | undefined;
  },
) {
  const owned = and(
    eq(actionItems.id, id),
    eq(actionItems.ownerEmail, ownerEmail),
  );
  const [updated] = await getDb()
    .update(actionItems)
    .set({
      ...(fields.body !== undefined ? { body: fields.body } : {}),
      ...(fields.assignee !== undefined ? { assignee: fields.assignee } : {}),
      ...(event ? { status: targetOf(event) } : {}),
    })
    .where(
      event
        ? and(
            owned,
            inArray(actionItems.status, actionItemMachine.fromStates(event)),
          )
        : owned,
    )
    .returning();
  if (updated) return updated;
  const [existing] = await getDb()
    .select({ status: actionItems.status })
    .from(actionItems)
    .where(owned);
  return existing
    ? conflict(`This action item is already ${existing.status}.`)
    : notFound("Action item");
}

const targetOf = (event: ActionItemEvent) =>
  actionItemMachine.transition(actionItemMachine.fromStates(event)[0]!, event);
