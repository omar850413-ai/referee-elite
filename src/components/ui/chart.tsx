"use client"

import * as React from "react"

const ChartContainer = () => null
const ChartTooltip = () => null
const ChartTooltipContent = () => null
const ChartLegend = () => null
const ChartLegendContent = () => null
const ChartStyle = () => null

export type ChartConfig = Record<string, any>

export function useChart() {
  return {
    config: {},
  }
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}