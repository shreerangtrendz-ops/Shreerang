// Define the 9 Standard Costing Paths
const PATHS = [
  {
    id: 'path_01',
    path_number: 1,
    path_name: 'Grey Only',
    description: 'Basic raw fabric path',
    execution_order: ['GREY', 'FOLD', 'PACK', 'TRANS']
  },
  {
    id: 'path_02',
    path_number: 2,
    path_name: 'RFD Only',
    description: 'Ready for Dyeing preparation',
    execution_order: ['GREY', 'SCOUR', 'BLEACH', 'WASH']
  },
  {
    id: 'path_03',
    path_number: 3,
    path_name: 'Digital Print on RFD',
    description: 'Standard Digital Printing flow',
    execution_order: ['GREY', 'RFD', 'COAT', 'DIG_INK', 'STEAM', 'WASH', 'FINISH']
  },
  {
    id: 'path_04',
    path_number: 4,
    path_name: 'Mill Process',
    description: 'Industrial mill processing',
    execution_order: ['GREY', 'DESIZE', 'SCOUR', 'BLEACH', 'MERCER']
  },
  {
    id: 'path_05',
    path_number: 5,
    path_name: 'Solid Dyed',
    description: 'Single color dyeing process',
    execution_order: ['GREY', 'DYE', 'FINISH']
  },
  {
    id: 'path_06',
    path_number: 6,
    path_name: 'Dyed/Print + Schiffli',
    description: 'Value addition on processed fabric',
    execution_order: ['GREY', 'PRINT', 'SCHIFFLI', 'DECA']
  },
  {
    id: 'path_07',
    path_number: 7,
    path_name: 'Schiffli + Dyed/Print',
    description: 'Value addition before coloring',
    execution_order: ['GREY', 'SCHIFFLI', 'DYE_PRINT']
  },
  {
    id: 'path_08',
    path_number: 8,
    path_name: 'Schiffli + Wash',
    description: 'Embroidery and simple wash',
    execution_order: ['GREY', 'SCHIFFLI', 'BIO_WASH']
  },
  {
    id: 'path_09',
    path_number: 9,
    path_name: 'Schiffli + RFD + Digital',
    description: 'Complex flow with embroidery and print',
    execution_order: ['GREY', 'SCHIFFLI', 'RFD', 'DIGITAL']
  }
];

export const CostingPathService = {
  async getAllPaths() {
    // In a real app, might fetch from DB, here return constants
    return Promise.resolve(PATHS);
  },

  async getPathById(id) {
    const path = PATHS.find(p => p.id === id);
    return Promise.resolve(path);
  }
};