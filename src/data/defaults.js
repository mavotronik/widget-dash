/** @typedef {{ id: number, type: string, x: number, y: number, w: number, h: number, text?: string, url?: string }} Widget */
/** @typedef {{ name: string, widgets: Widget[] }} Screen */
/** @typedef {{ theme: { primary: string, background: string }, currentScreen: number, screens: Screen[] }} DashboardData */

/** @type {DashboardData} */
export const defaultData = {
  theme: {
    primary: "#2196f3",
    background: "#111827",
  },
  currentScreen: 0,
  screens: [
    {
      name: "Главный",
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
          url: "https://picsum.photos/800/600",
          x: 620,
          y: 20,
          w: 500,
          h: 350,
        },
      ],
    },
    {
      name: "Второй экран",
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
