import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Point } from '../data/firebase'
export function GameMap({ points }: { points: { id:string; label:string; point:Point; color:string }[] }) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const centered = useRef(false)
  const [failed,setFailed] = useState(false)
  useEffect(() => {
    const instance = L.map(container.current!).setView([49.8,15.5],7)
    map.current = instance
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).on('tileerror',() => setFailed(true)).addTo(instance)
    layer.current = L.layerGroup().addTo(instance)
    return () => { instance.remove(); map.current = null; centered.current = false }
  },[])
  useEffect(() => {
    layer.current?.clearLayers()
    points.forEach(({label,point,color}) => {
      const text = document.createElement('span'); text.textContent = label
      L.circle([point.lat,point.lng],{ radius:point.accuracy,color,weight:1 }).addTo(layer.current!)
      L.circleMarker([point.lat,point.lng],{ radius:7,color }).bindTooltip(text).addTo(layer.current!)
    })
    if (!centered.current && points.length) {
      map.current?.setView([points[0].point.lat,points[0].point.lng],15); centered.current = true
    }
  },[points])
  return <><div ref={container} aria-label="Herní mapa" style={{height:360}} />{failed && <p>Mapové dlaždice nejsou dostupné. Souřadnice a stopy jsou také v seznamu pod mapou.</p>}</>
}
