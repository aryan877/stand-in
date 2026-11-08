import { MeetingsHome } from "@/components/meetings/home/MeetingsHome";

export function meta() {
  return [{ title: "Meetings - Stand-in" }];
}

export default function MeetingsRoute() {
  return <MeetingsHome />;
}
