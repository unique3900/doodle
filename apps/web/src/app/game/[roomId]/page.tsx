'use client'

import { Canvas } from '@/app/components/canvas'
import React from 'react'

const page = () => {
  return (
    <div>
        <Canvas canDraw={true} onDraw={() => {}} onClear={() => {}} />
    </div>
  )
}

export default page