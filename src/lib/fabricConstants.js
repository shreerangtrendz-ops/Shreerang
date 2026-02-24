export const BASE = ['Cotton', 'Polyester', 'Viscose', 'Rayon', 'PV', 'PC', 'Nylon', 'Silk', 'Wool', 'Hemp', 'Linen', 'Modal'];

export const WIDTH = ['28"', '30"', '36"', '40"', '44"', '48"', '50"', '54"', '56"', '58"', '62"', '66"', '72"', '78"'];

export const FINISH = ['Greige', 'RFD', 'PPF', 'Dyed', 'Printed', 'Bleached'];

export const CONSTRUCTION = ['Plain Weave', 'Twill', 'Satin', 'Dobby', 'Jacquard', 'Canvas', 'Voile', 'Georgette', 'Crepe', 'Organza', 'Chiffon', 'Velvet', 'Knitted/Jersey'];

export const YARN_TYPE = ['Spun', 'Filament', 'Textured'];

export const HANDFEEL = ['Soft', 'Crisp', 'Dry', 'Silky', 'Rough', 'Paper-touch'];

export const STRETCH = ['None', 'Rigid', 'Mechanical', '2 Way', '4 Way'];

export const TRANSPARENT = ['Opaque', 'Semi Sheer', 'Sheer', 'Blackout'];

// Helper to safely get constants with default
export const getConstant = (name) => {
  switch(name) {
    case 'BASE': return BASE;
    case 'WIDTH': return WIDTH;
    case 'FINISH': return FINISH;
    case 'CONSTRUCTION': return CONSTRUCTION;
    case 'YARN_TYPE': return YARN_TYPE;
    case 'HANDFEEL': return HANDFEEL;
    case 'STRETCH': return STRETCH;
    case 'TRANSPARENT': return TRANSPARENT;
    default: return [];
  }
};