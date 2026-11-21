export const quotePricing = {
  currency: "USD",
  itbmsRate: 0.07,
  rangeVariance: null,
  windows: {
    basePerSquareMeter: null,
    openingMultipliers: {
      sliding: 1,
      projecting: 1,
    },
    frameMultipliers: {
      natural: 1,
      white: 1.1,
      black: 1.18,
      bronze: 1.18,
      wood: 1.25,
    },
    glassPerSquareMeter: {
      clear: null,
      bronze: null,
      gray: null,
      reflective: null,
      tempered: null,
    },
  },
  bathroom: {
    basePerSquareMeter: null,
    thicknessMultipliers: {
      8: null,
      10: null,
    },
    doorMultipliers: {
      sliding: null,
      hinged: null,
    },
    hardwarePerDoor: {
      chrome: null,
      black: null,
    },
    glassPerSquareMeter: {
      clear: null,
      bronze: null,
      gray: null,
    },
  },
  kitchen: {
    baseCabinetPerLinearMeter: null,
    upperCabinetPerLinearMeter: null,
    materialMultipliers: {
      melamine: null,
      rh: null,
      pvc: null,
    },
    countertopPerLinearMeter: {
      none: 0,
      laminate: null,
      granite: null,
      quartz: null,
    },
  },
  welding: {
    perSquareMeter: {
      securityBars: null,
      gate: null,
      roof: null,
      custom: null,
    },
    perLinearMeter: {
      securityBars: null,
      gate: null,
      roof: null,
      custom: null,
    },
    finishPerSquareMeter: {
      primer: null,
      enamel: null,
    },
    finishPerLinearMeter: {
      primer: null,
      enamel: null,
    },
  },
  logistics: {
    center: {
      transportBase: null,
      transportPerUnit: null,
      installPerUnit: null,
    },
    sanMiguelito: {
      transportBase: null,
      transportPerUnit: null,
      installPerUnit: null,
    },
    east: { transportBase: null, transportPerUnit: null, installPerUnit: null },
    west: { transportBase: null, transportPerUnit: null, installPerUnit: null },
    interior: {
      transportBase: null,
      transportPerUnit: null,
      installPerUnit: null,
    },
  },
};
