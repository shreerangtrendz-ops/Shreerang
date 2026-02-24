export const PROCESS_STAGES = {
  0: {
    name: "RFD (Ready for Dyeing)",
    codes: ["RFD"],
    description: "Base preparation. Must be done first for prints/whites.",
    isMandatory: true,
    type: "PREP"
  },
  1: {
    name: "Core Coloring (Print/Dye)",
    codes: ["MP", "SP", "TP", "BP", "ODP", "DP", "SLD"],
    description: "The core coloring stage. Choose one of these per fabric.",
    isMandatory: false, // Conditionally mandatory based on design
    type: "CORE",
    isExclusive: true // Only one can be selected
  },
  2: {
    name: "Foil/Gold/Glitter",
    codes: ["FOIL", "GLD", "GLT"],
    description: "Surface embellishment. Can be done on base or processed fabric.",
    isMandatory: false,
    type: "OPTIONAL"
  },
  3: {
    name: "Embroidered",
    codes: ["EMB"],
    description: "Embroidery work.",
    isMandatory: false,
    type: "OPTIONAL"
  },
  4: {
    name: "Hakoba",
    codes: ["HK"],
    description: "Hakoba / Eyelet work.",
    isMandatory: false,
    type: "OPTIONAL"
  },
  5: {
    name: "Handwork",
    codes: ["HW"],
    description: "Manual work is delicate, usually comes after machine work.",
    isMandatory: false,
    type: "OPTIONAL"
  },
  6: {
    name: "Crush/Pleated",
    codes: ["CRH", "PLD"],
    description: "Texture formation. Must be done after printing/embroidery.",
    isMandatory: false,
    type: "OPTIONAL"
  },
  7: {
    name: "Deca/Washing",
    codes: ["DEC", "WSH"],
    description: "Final finish to set the feel and remove chemicals.",
    isMandatory: true,
    type: "FINISH"
  }
};

export const STAGE_CODE_LABELS = {
  "RFD": "Ready For Dyeing",
  "MP": "Mill Print (Rotary)",
  "SP": "Screen Print",
  "TP": "Table Print",
  "BP": "Block Print",
  "ODP": "ODP Print",
  "DP": "Digital Print",
  "SLD": "Solid Dyed",
  "FOIL": "Foil",
  "GLD": "Gold",
  "GLT": "Glitter",
  "EMB": "Embroidery",
  "HK": "Hakoba",
  "HW": "Handwork",
  "CRH": "Crush",
  "PLD": "Pleated",
  "DEC": "Decatising",
  "WSH": "Washing",
  "STAGE1": "Select Coloring Process" 
};