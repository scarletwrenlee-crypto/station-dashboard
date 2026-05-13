import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStations, type Station } from '../lib/api'

export default function MapView() {
  const [stations, setStations] = useState<Station[]>([])
  const mapRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => { getStations().then(setStations) }, [])

  useEffect(() => {
    if (!stations.length || !mapRef.current) return
    import('@amap/amap-jsapi-loader').then(AMapLoader => {
      AMapLoader.default.load({ key: import.meta.env.VITE_AMAP_KEY, version: '2.0' }).then((AMap: any) => {
        const map = new AMap.Map(mapRef.current!, {
          zoom: 12,
          center: [120.95, 31.38],
          mapStyle: 'amap://styles/light',
        })
        stations.forEach(s => {
          if (!s.lat || !s.lng) return
          const marker = new AMap.Marker({
            position: [s.lng, s.lat],
            icon: new AMap.Icon({
              size: new AMap.Size(12, 12),
              image: s.status === '运营中'
                ? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><circle cx="6" cy="6" r="5" fill="%231a1a1a"/></svg>'
                : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><circle cx="6" cy="6" r="5" fill="%23b0b0b0"/></svg>',
            }),
            offset: new AMap.Pixel(-6, -6),
          })
          marker.on('click', () => navigate(`/station/${s.id}`))
          map.add(marker)
        })
      })
    })
  }, [stations])

  return (
    <div className="relative w-full h-[calc(100vh-7rem)]">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur border border-[#e8e8e8] rounded-md p-3 flex gap-4 text-[12px]">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#1a1a1a]" /><span className="text-[#6b6b6b]">运营中</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#b0b0b0]" /><span className="text-[#6b6b6b]">试运营</span></div>
        <div className="ml-auto text-[#b0b0b0]">{stations.length} 站</div>
      </div>
    </div>
  )
}
