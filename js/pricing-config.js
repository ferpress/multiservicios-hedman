// Tarifas de demostración en USD; confirmar con el responsable comercial antes de publicar.
export const quotePricing = {
  currency: "USD",
  itbmsRate: 0.07,
  frameMultipliers: {
    natural: 1,
    white: 1.1,
    black: 1.2,
    bronze: 1.25,
  },
  windows: {
    basePerSquareMeter: 110,
    openingMultipliers: {
      sliding: 1,
      hinged: 1.05,
    },
    glassPerSquareMeter: {
      clear: 0,
      bronze: 14,
      laminated: 35,
      tempered: 50,
    },
  },
  bathroom: {
    basePerSquareMeter: 165,
    thicknessMultipliers: {
      8: 1,
      10: 1.15,
    },
    doorMultipliers: {
      sliding: 1.15,
      hinged: 1,
    },
    hardwarePerDoor: {
      chrome: 40,
      black: 65,
    },
    glassPerSquareMeter: {
      clear: 0,
      bronze: 14,
      laminated: 35,
      tempered: 50,
    },
  },
  kitchen: {
    baseCabinetPerLinearMeter: 240,
    upperCabinetPerLinearMeter: 240,
    materialMultipliers: {
      melamine: 1,
      rh: 1.15,
      pvc: 1.3,
    },
    countertopPerLinearMeter: {
      none: 0,
      laminate: 35,
      granite: 95,
      quartz: 145,
    },
    softClosePerLinearMeter: 15,
  },
  welding: {
    perSquareMeter: {
      securityBars: 95,
      gate: 130,
      roof: 110,
      custom: 125,
    },
    finishPerSquareMeter: {
      primer: 8,
      enamel: 18,
    },
  },
  logistics: {
    center: {
      transportBase: 15,
      transportPerUnit: 6,
      installPerUnit: 20,
    },
    sanMiguelito: {
      transportBase: 22,
      transportPerUnit: 7,
      installPerUnit: 24,
    },
    east: {
      transportBase: 30,
      transportPerUnit: 9,
      installPerUnit: 30,
    },
    west: {
      transportBase: 40,
      transportPerUnit: 12,
      installPerUnit: 35,
    },
    interior: {
      transportBase: 80,
      transportPerUnit: 15,
      installPerUnit: 50,
    },
  },
};
