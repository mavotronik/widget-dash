/**
 * @typedef {{ name: string }} SwitchPosition
 */
/**
 * @typedef {{
 *   id: number,
 *   type: string,
 *   x: number,
 *   y: number,
 *   w: number,
 *   h: number,
 *   text?: string,
 *   url?: string,
 *   fontSize?: number,
 *   fontFamily?: string,
 *   color?: string,
 *   value?: number,
 *   min?: number,
 *   max?: number,
 *   step?: number,
 *   label?: string,
 *   positions?: SwitchPosition[],
 *   selectedIndex?: number,
 *   emitMode?: "name" | "index",
 *   host?: string,
 *   attempts?: number,
 *   intervalMs?: number,
 *   status?: "unknown" | "ok" | "fail"
 * }} Widget
 */
/** @typedef {{ key: string, action: 'next' | 'goto', targetScreenIndex?: number }} EventTrigger */
/** @typedef {{ advanceMode: 'timer' | 'button' | 'event', displayDuration: number, enterEffect: 'none' | 'fade' | 'slideUp' | 'slideDown' | 'overlay', animationDuration: number, eventTrigger?: EventTrigger }} ScreenTransition */
/** @typedef {{ name: string, widgets: Widget[], transition: ScreenTransition }} Screen */
/** @typedef {{ designWidth: number, designHeight: number, pingIntervalMs: number, theme: { primary: string, background: string }, currentScreen: number, screens: Screen[] }} DashboardData */

/** @returns {ScreenTransition} */
export function defaultTransition() {
  return {
    advanceMode: "timer",
    displayDuration: 15,
    enterEffect: "fade",
    animationDuration: 500,
  };
}

/** @param {number} [designWidth] @param {number} [designHeight] @returns {DashboardData} */
export function createEmptyDashboard(designWidth = 1920, designHeight = 1080) {
  return {
    designWidth,
    designHeight,
    pingIntervalMs: 5000,
    theme: {
      primary: "#2196f3",
      background: "#111827",
    },
    currentScreen: 0,
    screens: [
      {
        name: "Экран 1",
        transition: defaultTransition(),
        widgets: [],
      },
    ],
  };
}

/** @type {DashboardData} */
export const defaultData = {
  designWidth: 1920,
  designHeight: 1080,
  pingIntervalMs: 5000,
  theme: {
    primary: "#2196f3",
    background: "#111827",
  },
  currentScreen: 0,
  screens: [
    {
      name: "Главный",
      transition: defaultTransition(),
      widgets: [
        { id: 1, type: "clock", x: 20, y: 20, w: 300, h: 120 },
        { id: 2, type: "date", x: 340, y: 20, w: 250, h: 120 },
        {
          id: 3,
          type: "text",
          text: "Добро пожаловать",
          x: 20,
          y: 170,
          w: 570,
          h: 120,
        },
        {
          id: 4,
          type: "image",
          url: "/images/placeholder.svg",
          x: 620,
          y: 20,
          w: 500,
          h: 350,
        },
      ],
    },
    {
      name: "Второй экран",
      transition: {
        ...defaultTransition(),
        enterEffect: "slideDown",
      },
      widgets: [
        {
          id: 5,
          type: "text",
          text: "Экран №2",
          x: 100,
          y: 100,
          w: 500,
          h: 150,
        },
      ],
    },
  ],
};
