"use client";

import { NumberInput, Table, TextInput, Button, Group, Text, Box, Stack, Anchor, Grid, Divider } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useState, useEffect } from 'react';
import axios from 'axios';
import QRCode from 'react-qr-code';

function calcBreakeven({ machineCost, machineHashrate, machineLifespan, wattage, costPerKwh, hashRateIncreasePerDay, startingHashrate, startingDate, price, dailyPriceIncrease }) {
  let netEarnings = 0;
  let totalKasEarnings = 0;
  let hashrate = Number(startingHashrate);
  let i = 0;
  let currentDate = new Date(startingDate);
  let chromaticReward = 220;
  let chromaticDate = new Date('2023-05-08');
  let machineLifespanEndDate = new Date(currentDate);
  machineLifespanEndDate.setFullYear(machineLifespanEndDate.getFullYear() + machineLifespan);

  let checkDate = new Date(chromaticDate);
  checkDate.setDate(chromaticDate.getDate() + 30);

  const dailyEarnings = [];

  while (currentDate > chromaticDate) {
    chromaticDate = checkDate;
    checkDate.setDate(chromaticDate.getDate() + 30);
    chromaticReward = Number((chromaticReward * (0.5 ** (1/12))).toFixed(8));
  }

  let breakEvenDate = null;

  while (currentDate <= machineLifespanEndDate) {
      while (currentDate > checkDate) {
        chromaticDate = checkDate;
        checkDate.setDate(chromaticDate.getDate() + 30);
        chromaticReward = Number((chromaticReward * (0.5 ** (1/12))).toFixed(8));
      }

      const blockReward = chromaticReward;
      const machineHashrateTH = machineHashrate / 1000;
      const currentRewardInKas = blockReward * 86400 * machineHashrateTH / hashrate;
      const totalRewards = price * currentRewardInKas;
      const totalCost = wattage * 24 * costPerKwh / 1000;

      const currentNetEarning = (totalRewards - totalCost);

      if (currentNetEarning <= 0) {
        if (!breakEvenDate) {
          breakEvenDate = new Date(currentDate);
        } else {
          console.info('About to go into the negative but breakeven date found', breakEvenDate);
        }
        console.info(hashrate, blockReward, totalRewards, totalCost, "About to take on a loss. Cannot mine any further");
        return {dailyEarnings, breakEvenDate, totalKasEarnings, netEarnings, canBreakEven: netEarnings >= machineCost, lifespanDate: currentDate, isLifeTimeReached: false};
      }

      netEarnings += currentNetEarning;
      totalKasEarnings += currentRewardInKas;

      if (!breakEvenDate && netEarnings >= machineCost) {
        breakEvenDate = new Date(currentDate);
        console.info('---------------------');
        console.info('Found the breakeven date', breakEvenDate);
        console.info('---------------------');
      }

      dailyEarnings.push({
        amountInFiat: currentNetEarning.toFixed(2),
        amountInKas: currentRewardInKas.toFixed(2),
        totalEarningsInFiat: netEarnings.toFixed(2),
        totalEarningsInKas: totalKasEarnings.toFixed(2),
        networkHashrate: hashrate,
        date: new Date(currentDate),
        price,
      });

      console.info(currentDate, `Net Earnings USD => KAS: ${netEarnings.toFixed(2)} => ${(netEarnings/price).toFixed(2)}\tDaily USD => KAS: ${totalRewards.toFixed(3)} => ${(totalRewards / price).toFixed(2)}\tNetwork Hashrate: ${(hashrate / 1000).toFixed(2)}\tPH/s`);

      // Iterate
      hashrate += Number(hashRateIncreasePerDay);
      price += Number(dailyPriceIncrease);
      currentDate.setDate(currentDate.getDate() + 1);
      i++;
  }
  
  // Bring it back one day
  currentDate.setDate(currentDate.getDate() - 1);

  if (!breakEvenDate) {
    breakEvenDate = new Date(currentDate);
  }

  return {dailyEarnings, breakEvenDate, totalKasEarnings, netEarnings, canBreakEven: true, lifespanDate: machineLifespanEndDate, isLifeTimeReached: true};
}

export function Welcome() {
  const [dailyEarnings, setDailyEarnings] = useState([]);
  const [canBreakEven, setCanBreakEven] = useState();
  const [isLifeTimeReached, setIsLifeTimeReached] = useState();
  const [hasCalculation, setHasCalculation] = useState(false);
  const [breakEvenDate, setBreakEvenDate] = useState();
  const [lifespanDate, setLifespanDate] = useState();
  const [netEarnings, setNetEarnings] = useState();
  const [totalKasReward, setTotalKasReward] = useState();

  const today = new Date();

  const form = useForm({
    initialValues: {
      machineCost: 750,
      machineHashrate: 200,
      machineLifespan: 5,
      wattage: 100,
      costPerKwh: 0.1,
      hashRateIncreasePerDay: 100,
      startingHashrate: 0,
      startingDate: today,
      price: 0,
      dailyPriceIncrease: 0,
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
    const {dailyEarnings, breakEvenDate, totalKasEarnings, netEarnings, canBreakEven, lifespanDate, isLifeTimeReached} = calcBreakeven(values);

    console.info(dailyEarnings, breakEvenDate, totalKasEarnings, netEarnings, canBreakEven, lifespanDate, isLifeTimeReached);

    setBreakEvenDate(breakEvenDate);
    setDailyEarnings(dailyEarnings);
    setCanBreakEven(canBreakEven);
    setIsLifeTimeReached(isLifeTimeReached);
    setHasCalculation(true);
    setLifespanDate(lifespanDate);
    setNetEarnings(netEarnings);
    setTotalKasReward(totalKasEarnings);
  }

  let table = null;
  let breakEvenText = null;
  let lifeTimeEarnings = null;

  if (hasCalculation) {
    const dateText = breakEvenDate.toISOString().split('T')[0]
    breakEvenText = (
      <Group position='center' m={'1rem'}>
        <Text c={canBreakEven ? 'green' : 'red'} fw={600}>
          { canBreakEven ? `You will break even on ${dateText}` : `You cannot break even and will be in the negative starting ${dateText}` }
        </Text>
      </Group>
    );

    if (canBreakEven) {
      const lifespanDateText = lifespanDate.toISOString().split('T')[0]
      let lifespanText = null;
      if (isLifeTimeReached) {
        lifespanText = 'Until end of machine lifespan on: ';
      } else {
        lifespanText = 'Until mining at a loss on: ';
      }

      lifespanText += lifespanDateText;
      
      lifeTimeEarnings = (
        <Group position='center' m={'1rem'}>
          <Stack >
            <Text fw={600}>
              Total earnings: {totalKasReward.toFixed(2)} KAS and ${netEarnings.toFixed(2)}
            </Text>
            <Text fw={600}>
              {lifespanText}
            </Text>
          </Stack>
        </Group>
      );
    }

    const rows = dailyEarnings.map(({date, amountInFiat, amountInKas, totalEarningsInFiat, totalEarningsInKas, networkHashrate, price }) => {
      return (
        <tr key={date.toISOString().split('T')[0]}>
          <td>{date.toISOString().split('T')[0]}</td>
          <td>${amountInFiat}</td>
          <td>{amountInKas} KAS</td>
          <td>${totalEarningsInFiat}</td>
          <td>{totalEarningsInKas} KAS</td>
          <td>{(networkHashrate / 1000).toFixed(2)} PH/s</td>
          <td>${price.toFixed(5)}</td>
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
            <th>Price</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </Table>
    );
  }

  const DONATION_ADDR = 'kaspa:qpfp8gzttv5c356p8cdj0kv56py4n29w97prxrav65m0zpn58yuaz3awck5vl';
  return (
    <>
    <Box maw={390} mx="auto">
      <form onSubmit={form.onSubmit(handleSubmit)}>

        <Text align='center' fw={600}>Machine Details</Text>
        <Grid>
          <Grid.Col span={4}>
            <NumberInput
              withAsterisk
              label="Cost"
              placeholder="1000"
              {...form.getInputProps('machineCost')}
            />
          </Grid.Col>

          <Grid.Col span={4}>
            <NumberInput
              withAsterisk
              label="Hashrate (GH/s)"
              placeholder="1000"
              step={1}
              min={0}
              {...form.getInputProps('machineHashrate')}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <NumberInput
                withAsterisk
                label="Lifespan (Years)"
                placeholder="1000"
                step={1}
                max={5}
                min={1}
                {...form.getInputProps('machineLifespan')}
              />
          </Grid.Col>
        </Grid>

        <Grid>
          <Grid.Col span={6}>
            <NumberInput
              withAsterisk
              label="Wattage"
              placeholder="65"
              {...form.getInputProps('wattage')}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <NumberInput
              withAsterisk
              label="Cost per KWH"
              placeholder="0.1"
              precision={3}
              {...form.getInputProps('costPerKwh')}
            />
          </Grid.Col>
        </Grid>

        <Divider m={'1rem'}/>

        <Text align='center' fw={600}>Network and Other Details</Text>

        <Grid>
          <Grid.Col span={6}>
            <NumberInput
              withAsterisk
              label="Network Hashrate on start of mining (TH/s)"
              placeholder="4730"
              {...form.getInputProps('startingHashrate')}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <NumberInput
              withAsterisk
              label="Daily Hashrate Increase (TH/s)"
              placeholder="147"
              {...form.getInputProps('hashRateIncreasePerDay')}
            />
          </Grid.Col>
        </Grid>

        <Grid>
          <Grid.Col span={6}>
            <TextInput
              withAsterisk
              label="Kaspa Price"
              placeholder="0.5"
              {...form.getInputProps('price')}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <NumberInput
              label="Daily Price Increase"
              min={-1}
              step={0.00001}
              max={1}
              precision={5}
              {...form.getInputProps('dailyPriceIncrease')}
            />
          </Grid.Col>
        </Grid>

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

        <Group position='center' mt="md">
          <Button type="submit" w={'100%'}>Estimate Breakeven Date</Button>
        </Group>
      </form>
    </Box>

    <Group position='center' mt={'1rem'}>
        <Stack align='center' style={{gap: 0}} justify='end'>

          <div className="DonationQR">
            <QRCode style={{'width': '100%', 'height': '100%'}}
              value={DONATION_ADDR} />
          </div>

          <Text size={'xs'}>
            Found this useful? Consider donating to:
          </Text>
          <Anchor c='#49eacb' href={`https://explorer.kaspa.org/addresses/${DONATION_ADDR}`} target="_blank" size={'xs'} align='center'>
            {DONATION_ADDR}
          </Anchor>

          <Anchor c='#49eacb' href="https://github.com/coderofstuff/kas-breakeven-calc" target="_blank" size={'xs'}>
            kas-breakeven-calc by coderofstuff
          </Anchor>
        </Stack>
      </Group>

    {breakEvenText}

    {lifeTimeEarnings}

    {table}
    </>
  );
}