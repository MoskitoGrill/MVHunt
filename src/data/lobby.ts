import type { Auth } from 'firebase/auth'
export interface Member { role: 'host' | 'deputy' | 'hunter' | 'fugitive'; team: 'hunter' | 'fugitive'; nickname: string; playerId: string; readyAt?: number; measuredAt?: number }
export interface JoinRequest { nickname: string; team: string; target?: string; at: number }
export interface Capture { at:number; uid:string; operationId:string; correctedAt?:number; correctedBy?:string }
export interface Round { endedAt?:number; reason?:string; captures?:Record<string,Capture> }
export async function lobbyCommand(auth: Auth, action: string, body: Record<string, unknown>) {
  if (!auth.currentUser) throw new Error('Chybí přihlášení.')
  const endpoint = import.meta.env.VITE_LOBBY_API_URL || (import.meta.env.DEV ? '/api/lobby' : '')
  if (!endpoint) throw new Error('Chybí VITE_LOBBY_API_URL důvěryhodného serveru čekárny.')
  const response = await fetch(`${endpoint}/${action}`, { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await auth.currentUser.getIdToken()}` }, body: JSON.stringify(body) })
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Server čekárny není dostupný nebo není nakonfigurován.')
  const result = await response.json() as { error?: string; gameId: string; code?: string }
  if (!response.ok) throw new Error(result.error ?? 'Server operaci odmítl.')
  return result
}
