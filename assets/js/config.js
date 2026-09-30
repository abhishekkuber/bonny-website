// Site-wide settings. Safe to commit: nothing here is secret.

export const CONFIG = {
  her: { nickname: 'bonny' },
  me: { nickname: 'kubie' },

  places: {
    me: { city: 'Pune', timezone: 'Asia/Kolkata', lat: 18.5204, lon: 73.8567 },
    her: { city: 'London', timezone: 'Europe/London', lat: 51.5072, lon: -0.1276 },
  },

  // Same Sky: the hours (24h, local time) each of you counts as awake for a "sky date".
  // Past midnight is fine: [8, 25] means 8am to 1am.
  skyDate: { herHours: [8, 24], myHours: [8, 24] },

  // NASA Astronomy Picture of the Day. Get a free key at https://api.nasa.gov
  // and paste it here. Empty = NASA's shared DEMO_KEY (heavily rate-limited).
  nasa: { apiKey: 'cOKxWqtSvKZ5QLQIwHROgCUKWpmgB03qGAvZvDhw' },

  // Filled in when we add Supabase. The anon key is meant to be public;
  // Row Level Security policies are what protect the data.
  supabase: { url: 'https://qfxavyjqaxcefbzpyofl.supabase.co', anonKey: 'sb_publishable_w360tejtAqfRa04Fvungdw_hpuYijL5' },
};
