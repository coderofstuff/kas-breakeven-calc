const chromaticHalvingSchedule = [
    [195.997718, new Date('2023-07-08')],
    [184.9972114, new Date('2023-08-07')],
    [174.6141157, new Date('2023-09-07')],
    [164.8137785, new Date('2023-10-07')],
    [155.5634919, new Date('2023-11-06')],
    [146.832384, new Date('2023-12-07')],
    // Add more of these if relevant to you
    // ...
];

// Inputs
// Update these with figures relevant for you
const machineCost = 1000; // In USD
const machineHashrate = 0.1; // In TH
const wattage = 65; // Watts at the wall
const costPerKwh = 0.1; // In USD
const hashRateIncreasePerDay = 147; // TH/s
const startingHashrate = 4730; // TH/s - the hashrate at the day you start mining - estimate this
const startingDate = new Date('2023-08-15'); // The day you start mining
const price = 0.047; // In USD

let netEarnings = 0;
let chromaticIndex = 0;
let hashrate = startingHashrate;
let i = 0;

while (netEarnings < machineCost && i < 300) {
    while (chromaticHalvingSchedule.length - 1 > chromaticIndex && chromaticHalvingSchedule[chromaticIndex][1] < startingDate) {
        chromaticIndex++;
    }

    const blockReward = chromaticHalvingSchedule[chromaticIndex][0];
    const totalRewards = price * blockReward * 86400 * machineHashrate / hashrate;
    const totalCost = wattage * 24 * costPerKwh / 1000;

    netEarnings += (totalRewards - totalCost);
    console.info(startingDate, `Net Earnings USD => KAS: ${netEarnings.toFixed(2)} => ${(netEarnings/price).toFixed(2)}\tDaily USD => KAS: ${totalRewards.toFixed(3)} => ${(totalRewards / price).toFixed(2)}\tNetwork Hashrate: ${(hashrate / 1000).toFixed(2)}\tPH/s`);

    // Iterate
    hashrate += hashRateIncreasePerDay;
    startingDate.setDate(startingDate.getDate() + 1);
    i++;
}

// Break even date
console.info(`Breakeven on date: `, startingDate, netEarnings);