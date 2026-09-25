import ICAL from "ical.js";

const json = (response, status, body) => {
  response.status(status).json(body);
};

export default async function handler(request, response) {
  const icsUrl = process.env.FAMILY_CALENDAR_ICS_URL;
  if (!icsUrl) {
    return json(response, 500, { error: "Ingen kalenderlänk konfigurerad" });
  }

  // webcal:// is just https:// with a different scheme name.
  const fetchUrl = icsUrl.replace(/^webcal:\/\//i, "https://");

  let text;
  try {
    const upstream = await fetch(fetchUrl, {
      headers: { Accept: "text/calendar, text/plain, */*" },
    });
    if (!upstream.ok) {
      return json(response, 502, { error: `Kalendern svarade ${upstream.status}` });
    }
    text = await upstream.text();
  } catch (error) {
    console.error("Kunde inte hämta familjekalendern", error);
    return json(response, 502, { error: "Kunde inte hämta kalendern" });
  }

  let events;
  try {
    const jcal = ICAL.parse(text);
    const comp = new ICAL.Component(jcal);
    const now = new Date();
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    events = comp
      .getAllSubcomponents("vevent")
      .flatMap((ve) => {
        const event = new ICAL.Event(ve);
        const base = { uid: event.uid, title: event.summary || "Händelse" };

        if (event.isRecurring()) {
          const expand = event.iterator();
          const occurrences = [];
          let next;
          // eslint-disable-next-line no-cond-assign
          while ((next = expand.next())) {
            const start = next.toJSDate();
            if (start > horizon) break;
            const details = event.getOccurrenceDetails(next);
            const end = details.endDate.toJSDate();
            if (end >= now) {
              occurrences.push({ ...base, start: start.toISOString(), end: end.toISOString() });
            }
            if (occurrences.length > 20) break;
          }
          return occurrences;
        }

        const start = event.startDate.toJSDate();
        const end = event.endDate.toJSDate();
        if (end < now || start > horizon) return [];
        return [{ ...base, start: start.toISOString(), end: end.toISOString() }];
      })
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 30);
  } catch (error) {
    console.error("Kunde inte tolka kalendern", error);
    return json(response, 502, { error: "Kunde inte tolka kalendern" });
  }

  response.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1800");
  return json(response, 200, { events });
}
