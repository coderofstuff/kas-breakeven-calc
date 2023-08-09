"use client";

import { NumberInput, Table, TextInput, Button, Group, Text, Box } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useState, useEffect } from 'react';
import axios from 'axios';


function calcBreakeven({ machineCost, machineHashrate, wattage, costPerKwh, hashRateIncreasePerDay, startingHashrate, startingDate, price }) {
  let netEarnings = 0;
  let hashrate = Number(startingHashrate);
  let i = 0;
  let currentDate = new Date(startingDate);
  let chromaticReward = 220;
  let chromaticDate = new Date('2023-05-08');

  let checkDate = new Date(chromaticDate);
  checkDate.setDate(chromaticDate.getDate() + 30);

  const dailyEarnings = [];

  while (currentDate > chromaticDate) {
    chromaticDate = checkDate;
    checkDate.setDate(chromaticDate.getDate() + 30);
    chromaticReward = Number((chromaticReward * (0.5 ** (1/12))).toFixed(8));
  }

  while (netEarnings < machineCost) {
      while (currentDate > checkDate) {
        chromaticDate = checkDate;
        checkDate.setDate(chromaticDate.getDate() + 30);
        chromaticReward = Number((chromaticReward * (0.5 ** (1/12))).toFixed(8));
      }

      const blockReward = chromaticReward;
      const totalRewards = price * blockReward * 86400 * machineHashrate / hashrate;
      const totalCost = wattage * 24 * costPerKwh / 1000;

      const currentNetEarning = (totalRewards - totalCost);

      if (currentNetEarning <= 0) {
        console.info(hashrate, blockReward, totalRewards, totalCost, "About to take on a loss. Cannot mine any further");
        return {dailyEarnings, breakEvenDate: currentDate, netEarnings, canBreakEven: false};
      }

      netEarnings += currentNetEarning;

      dailyEarnings.push({
        amountInFiat: currentNetEarning.toFixed(2),
        amountInKas: (currentNetEarning/price).toFixed(2),
        totalEarningsInFiat: netEarnings.toFixed(2),
        totalEarningsInKas: (netEarnings/price).toFixed(2),
        networkHashrate: hashrate,
        date: new Date(currentDate),
      });
      console.info(currentDate, `Net Earnings USD => KAS: ${netEarnings.toFixed(2)} => ${(netEarnings/price).toFixed(2)}\tDaily USD => KAS: ${totalRewards.toFixed(3)} => ${(totalRewards / price).toFixed(2)}\tNetwork Hashrate: ${(hashrate / 1000).toFixed(2)}\tPH/s`);

      // Iterate
      hashrate += Number(hashRateIncreasePerDay);
      currentDate.setDate(currentDate.getDate() + 1);
      i++;
  }
  
  // Bring it back one day
  currentDate.setDate(currentDate.getDate() - 1);

  return {dailyEarnings, breakEvenDate: currentDate, netEarnings, canBreakEven: true};
}

export function Welcome() {
  const [dailyEarnings, setDailyEarnings] = useState([]);
  const [canBreakEven, setCanBreakEven] = useState();
  const [hasCalculation, setHasCalculation] = useState(false);
  const [breakEvenDate, setBreakEvenDate] = useState();

  const today = new Date();

  const form = useForm({
    initialValues: {
      machineCost: 750,
      machineHashrate: 0.1,
      wattage: 65,
      costPerKwh: 0.1,
      hashRateIncreasePerDay: 100,
      startingHashrate: 0,
      startingDate: today,
      price: 0,
    },
    validate: {
      startingDate: (date) => {
        return date < new Date('2023-06-01') ? 'ASICs only arrived after 2023-06-01' : null;
      },
    }
  });

  useEffect(() => {
    const pricePromise = axios.get('https://api.kaspa.org/info/price').then(({ data }) => {
      return Number(data.price.toFixed(3));
    }).catch((e) => {
      console.error(e);
      return 0.05;
    });

    const hashratePromise = axios.get('https://api.kaspa.org/info/hashrate').then(({ data }) => {
      return Math.ceil(data.hashrate);
    }).catch((e) => {
      console.error(e);
      return 5000;
    });

    let unloaded = false;
    Promise.all([pricePromise, hashratePromise]).then(([price, hashrate]) => {
      if (!unloaded) {
        form.setValues({ price, startingHashrate: hashrate});
      }
    });

    return () => {
      unloaded = true;
    };
  }, []);

  function handleSubmit(values) {
    const {dailyEarnings, breakEvenDate, netEarnings, canBreakEven} = calcBreakeven(values);

    console.info(dailyEarnings, breakEvenDate, netEarnings, canBreakEven);

    setBreakEvenDate(breakEvenDate);
    setDailyEarnings(dailyEarnings);
    setCanBreakEven(canBreakEven);
    setHasCalculation(true);
  }

  let table = null;
  let breakEvenText = null;

  if (hasCalculation) {
    const dateText = breakEvenDate.toISOString().split('T')[0]
    breakEvenText = (
      <Group position='center' >
        <Text c={canBreakEven ? 'green' : 'red'}>
          { canBreakEven ? `You will break even on ${dateText}` : `You cannot break even and will be in the negative starting ${dateText}` }
        </Text>
      </Group>
    );

    const rows = dailyEarnings.map(({date, amountInFiat, amountInKas, totalEarningsInFiat, totalEarningsInKas, networkHashrate }) => {
      return (
        <tr key={date.toISOString().split('T')[0]}>
          <td>{date.toISOString().split('T')[0]}</td>
          <td>${amountInFiat}</td>
          <td>{amountInKas} KAS</td>
          <td>${totalEarningsInFiat}</td>
          <td>{totalEarningsInKas} KAS</td>
          <td>{(networkHashrate / 1000).toFixed(2)} PH/s</td><td/>
        </tr>
      )
    });
    table = (
      <Table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Daily Yield in Fiat</th>
            <th>Daily Yield in KAS</th>
            <th>Total Yield in Fiat</th>
            <th>Total Yield in KAS</th>
            <th>Network Hashrate</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </Table>
    );
  }

  return (
    <>
    <Box maw={340} mx="auto">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <NumberInput
          withAsterisk
          label="Machine Cost"
          placeholder="1000"
          {...form.getInputProps('machineCost')}
        />

        <NumberInput
          withAsterisk
          label="Machine Hashrate (TH/s)"
          placeholder="0.1"
          precision={3}
          {...form.getInputProps('machineHashrate')}
        />

        <NumberInput
          withAsterisk
          label="Wattage"
          placeholder="65"
          {...form.getInputProps('wattage')}
        />

        <NumberInput
          withAsterisk
          label="Cost per KWH"
          placeholder="0.1"
          precision={3}
          {...form.getInputProps('costPerKwh')}
        />

        <NumberInput
          withAsterisk
          label="Hashrate Increase per Day (TH/s)"
          placeholder="147"
          {...form.getInputProps('hashRateIncreasePerDay')}
        />

        <NumberInput
          withAsterisk
          label="Network Hashrate on start of mining (TH/s)"
          placeholder="4730"
          {...form.getInputProps('startingHashrate')}
        />

        <TextInput
          withAsterisk
          label="Kaspa Price"
          placeholder="0.5"
          {...form.getInputProps('price')}
        />

        <DateInput
          withAsterisk
          label="Mining Start Date"
          placeholder="2023-08-06"
          {...form.getInputProps('startingDate')}
        />

        <Group position='center'>
          <Text>
            *** This calculator assumes daily growth of hashrate and price will both be constant. NFA
          </Text>
        </Group>

        <Group justify="flex-end" mt="md">
          <Button type="submit">Estimate Breakeven Date</Button>
        </Group>
      </form>
    </Box>

    {breakEvenText}

    {table}
    </>
  );
}