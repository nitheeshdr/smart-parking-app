import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllLots, updateLot } from '../../api/lots';
import { Button, ErrorState, Field, Loading, Screen, Segmented } from '../../components/ui';
import { errorMessage, hm, isValidTime } from '../../lib/format';
import type { LotStatus, ParkingLot } from '../../types/db';

function EditForm({ lot, onDone }: { lot: ParkingLot; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [f, setF] = useState({
    name: lot.name,
    description: lot.description ?? '',
    address: lot.address,
    city: lot.city,
    pincode: lot.pincode,
    lat: String(lot.latitude),
    lng: String(lot.longitude),
    open: hm(lot.opening_time),
    close: hm(lot.closing_time),
  });
  const [status, setStatus] = useState<LotStatus>(lot.status);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: () => {
      if (!f.name.trim() || !f.address.trim() || !f.city.trim() || !f.pincode.trim()) throw new Error('Name, address, city and pincode are required.');
      const latitude = Number(f.lat);
      const longitude = Number(f.lng);
      if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) throw new Error('Enter a valid latitude and longitude.');
      if (!isValidTime(f.open) || !isValidTime(f.close) || f.open >= f.close) throw new Error('Use 24-hour HH:MM and open before close.');
      return updateLot(lot.id, { name: f.name.trim(), description: f.description.trim(), address: f.address.trim(), city: f.city.trim(), pincode: f.pincode.trim(), latitude, longitude, opening_time: `${f.open}:00`, closing_time: `${f.close}:00`, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_lots'] });
      queryClient.invalidateQueries({ queryKey: ['lots'] });
      onDone();
    },
    onError: (e) => Alert.alert('Could not save', errorMessage(e)),
  });

  return (
    <>
      <Field label="Lot name" icon="business-outline" value={f.name} onChangeText={set('name')} autoCapitalize="words" />
      <Field label="Description" value={f.description} onChangeText={set('description')} autoCapitalize="sentences" />
      <Field label="Address" icon="location-outline" value={f.address} onChangeText={set('address')} autoCapitalize="words" />
      <Field label="City" value={f.city} onChangeText={set('city')} autoCapitalize="words" />
      <Field label="Pincode" value={f.pincode} onChangeText={set('pincode')} keyboardType="number-pad" />
      <Field label="Latitude" value={f.lat} onChangeText={set('lat')} keyboardType="numbers-and-punctuation" />
      <Field label="Longitude" value={f.lng} onChangeText={set('lng')} keyboardType="numbers-and-punctuation" />
      <Field label="Opens (24h HH:MM)" icon="time-outline" value={f.open} onChangeText={set('open')} maxLength={5} keyboardType="numbers-and-punctuation" />
      <Field label="Closes (24h HH:MM)" icon="time-outline" value={f.close} onChangeText={set('close')} maxLength={5} keyboardType="numbers-and-punctuation" />
      <Segmented value={status} onChange={setStatus} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Hidden' }, { value: 'maintenance', label: 'Maintenance' }]} />
      <Button label="Save changes" icon="checkmark-circle-outline" loading={save.isPending} onPress={() => save.mutate()} />
    </>
  );
}

export default function LotEditScreen() {
  const router = useRouter();
  const lots = useQuery({ queryKey: ['all_lots'], queryFn: fetchAllLots });
  const lot = lots.data?.[0];

  return (
    <Screen title="Edit lot" subtitle="Slots and live status come from the hardware" onBack={() => router.back()}>
      {lots.isLoading ? <Loading /> : lots.error || !lot ? <ErrorState error={lots.error ?? new Error('No lot found.')} onRetry={lots.refetch} /> : <EditForm lot={lot} onDone={() => router.back()} />}
    </Screen>
  );
}
