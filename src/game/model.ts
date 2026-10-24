/** E1 pouze označuje demonstraci; pravidla a fáze vzniknou v E2. */
export interface DemoSnapshot {
  gameId: string
  source: 'demo'
}

/** Unix timestamp v milisekundách. Hodiny lze v E2 nahradit simulací. */
export interface Clock {
  now(): number
}
