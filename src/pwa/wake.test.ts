import { describe, expect, it, vi } from 'vitest'
import { HoldToUnlock, ScreenWake, type Sentinel, type WakeState } from './wake'

function sentinel() {
  let released = false
  let listener = () => {}
  return { get released(){return released}, release:vi.fn(async()=>{released=true;listener()}), addEventListener:(_type:'release',fn:()=>void)=>{listener=fn} }
}
const settle = async()=>{await Promise.resolve();await Promise.resolve()}
describe('Screen Wake Lock ownership',()=>{
  it('reports system loss and reacquires on return, without a retry loop',async()=>{
    const first=sentinel(),second=sentinel(),report=vi.fn()
    const request=vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second)
    let visible=true
    const wake=new ScreenWake(request,()=>visible,report)
    wake.enable();await settle();expect(report).toHaveBeenLastCalledWith('active')
    visible=false;await first.release();expect(report).toHaveBeenLastCalledWith('lost')
    wake.resume();expect(request).toHaveBeenCalledTimes(1)
    visible=true;wake.resume();await settle();expect(report).toHaveBeenLastCalledWith('active')
    wake.disable();expect(second.release).toHaveBeenCalledTimes(1);expect(report).toHaveBeenLastCalledWith('off')
  })
  it('releases late permission results after disable and ignores old release events',async()=>{
    let resolve!:(s:Sentinel)=>void
    const request=vi.fn(()=>new Promise<Sentinel>(r=>{resolve=r}))
    const states:WakeState[]=[]
    const wake=new ScreenWake(request,()=>true,s=>states.push(s))
    wake.enable();wake.disable();const late=sentinel();resolve(late);await settle()
    expect(late.release).toHaveBeenCalledOnce();expect(states.at(-1)).toBe('off')
  })
  it('does not retain a lock granted while the document became hidden',async()=>{
    let resolve!:(s:Sentinel)=>void,visible=true
    const wake=new ScreenWake(()=>new Promise(r=>{resolve=r}),()=>visible,()=>{})
    wake.enable();visible=false;const late=sentinel();resolve(late);await settle();expect(late.release).toHaveBeenCalledOnce()
  })
  it('reports unsupported and denied separately and permits explicit retry',async()=>{
    const report=vi.fn(),request=vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    new ScreenWake(undefined,()=>true,report).enable();expect(report).toHaveBeenLastCalledWith('unsupported')
    const wake=new ScreenWake(request,()=>true,report);wake.enable();wake.resume();await settle()
    expect(request).toHaveBeenCalledOnce();expect(report).toHaveBeenLastCalledWith('denied')
    wake.resume();await settle();expect(request).toHaveBeenCalledTimes(2)
  })
})
it('requires one uninterrupted two second hold and clears partial/ready holds on cancel',()=>{
  let now=0
  const hold=new HoldToUnlock(()=>now)
  hold.start();now=1999;expect(hold.ready()).toBe(false)
  hold.cancel();now=2000;expect(hold.ready()).toBe(false)
  hold.start();now=3999;hold.start();expect(hold.ready()).toBe(false)
  now=4000;expect(hold.ready()).toBe(true);hold.cancel();expect(hold.ready()).toBe(false)
})
