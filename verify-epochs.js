const units = require('./data/units.json');
const epochs = require('./data/epochs.json');

console.log('=== EPOCH-BASED UNIT VERIFICATION ===');
epochs.forEach(epoch => {
  const epochUnits = units.filter(u => u.epoch === epoch.id);
  console.log('');
  console.log(epoch.name + ' (' + epoch.id + '): ' + epochUnits.length + ' units');
  epochUnits.forEach(u => console.log('  - ' + u.name + ' (' + u.goldCost + 'g)'));
});
