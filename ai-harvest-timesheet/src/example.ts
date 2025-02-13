import { DistributionService } from './services/distributionService';

// Run the example
const { explanation } = DistributionService.getDistributionExample();

// Print the detailed explanation
console.log('Hour Distribution Example\n');
console.log(explanation.join('\n')); 