import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Separator } from 'heroui-native';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { AppIcon } from '../../../components/app-icon';
import { COLORS, SIZES } from '../../../constants/theme';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { TextInput } from 'react-native';
import MapplsGL from 'mappls-map-react-native';

const DEFAULT_CENTER = [77.5946, 12.9716]; // Bangalore

export default function CreateLotScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [initialLocation, setInitialLocation] = useState<{lat: number, lng: number} | null>(null);

  React.useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const pos = await Location.getCurrentPositionAsync({});
          setInitialLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        } catch (e) { }
      }
    })();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    pincode: '',
    opening_time: '06:00:00',
    closing_time: '23:00:00',
    total_capacity: '50',
    hourly_price: '50',
    visibility_range_km: '10',
    latitude: '',
    longitude: '',
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.address || !formData.city || !formData.pincode || !formData.latitude || !formData.longitude) {
      Alert.alert('Error', 'Please fill in all required fields and pick a location on the map.');
      return;
    }

    setLoading(true);
    try {
      const latitude = Number(formData.latitude);
      const longitude = Number(formData.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new Error('Enter valid latitude and longitude values.');
      }
      
      const { data: manager, error: mErr } = await supabase
        .from('parking_managers')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();
        
      if (mErr) throw mErr;
      if (!manager) {
        Alert.alert('Error', 'No parking manager profile found for this user.');
        setLoading(false);
        return;
      }

      const requestedCapacity = parseInt(formData.total_capacity, 10);
      if (!Number.isInteger(requestedCapacity) || requestedCapacity < 1 || requestedCapacity > 500) {
        throw new Error('Capacity must be a whole number between 1 and 500.');
      }

      const { data: newLot, error } = await supabase
        .from('parking_lots')
        .insert({
          manager_id: manager.id,
          name: formData.name,
          address: formData.address,
          city: formData.city,
          pincode: formData.pincode,
          opening_time: formData.opening_time,
          closing_time: formData.closing_time,
          total_capacity: requestedCapacity,
          available_capacity: requestedCapacity,
          visibility_range_km: parseInt(formData.visibility_range_km) || 10,
          latitude,
          longitude,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      
      const price = parseInt(formData.hourly_price, 10) || 50;
      const slotsToCreate = Array.from({ length: requestedCapacity }, (_, index) => ({
        parking_lot_id: newLot.id,
        slot_number: `S-${String(index + 1).padStart(3, '0')}`,
        slot_type: 'regular',
        vehicle_type: 'car',
        floor: '1',
        hourly_price: price,
        status: 'available',
      }));
      const { error: slotError } = await supabase.from('parking_slots').insert(slotsToCreate);
      if (slotError) throw slotError;
      
      Alert.alert('Success', 'Parking lot created successfully!');
      queryClient.invalidateQueries({ queryKey: ['manager_lots'] });
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const centerLat = initialLocation ? initialLocation.lat : DEFAULT_CENTER[1];
  const centerLng = initialLocation ? initialLocation.lng : DEFAULT_CENTER[0];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button variant="flat" size="sm" onPress={() => router.back()} style={styles.backBtn}>
          <AppIcon name="chevron-back" size={20} color={COLORS.text} />
        </Button>
        <Text style={styles.title}>Add New Lot</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lot Details</Text>
            
            <Text style={styles.label}>Lot Name</Text>
            <TextInput 
              style={styles.input}
              placeholder="e.g. Downtown Central" 
              placeholderTextColor={COLORS.textDisabled}
              value={formData.name}
              onChangeText={(v) => setFormData({...formData, name: v})}
            />

            <Text style={styles.label}>Address</Text>
            <TextInput 
              style={styles.input}
              placeholder="Street address" 
              placeholderTextColor={COLORS.textDisabled}
              value={formData.address}
              onChangeText={(v) => setFormData({...formData, address: v})}
            />

            <View style={{flexDirection: 'row', gap: SIZES.md}}>
              <View style={{flex: 1}}>
                <Text style={styles.label}>City</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="City" 
                  placeholderTextColor={COLORS.textDisabled}
                  value={formData.city}
                  onChangeText={(v) => setFormData({...formData, city: v})}
                />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.label}>Pincode</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="Zip/Pin code" 
                  placeholderTextColor={COLORS.textDisabled}
                  value={formData.pincode}
                  onChangeText={(v) => setFormData({...formData, pincode: v})}
                />
              </View>
            </View>
          </View>

          <Separator style={styles.sep} />

          <View style={styles.section}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
              <Text style={styles.sectionTitle}>Location</Text>
              <Text style={styles.hintTxt}>Tap map to pin</Text>
            </View>
            
            <View style={styles.mapWrap}>
              <MapplsGL.MapView 
                style={styles.map}
                onPress={(e) => {
                  if (e.geometry && e.geometry.coordinates) {
                    const lng = e.geometry.coordinates[0];
                    const lat = e.geometry.coordinates[1];
                    setFormData(prev => ({
                      ...prev,
                      latitude: lat.toFixed(6),
                      longitude: lng.toFixed(6)
                    }));
                  }
                }}
              >
                <MapplsGL.Camera
                  zoomLevel={13}
                  centerCoordinate={[centerLng, centerLat]}
                />
                
                {initialLocation && (
                  <MapplsGL.PointAnnotation id="user-loc" coordinate={[initialLocation.lng, initialLocation.lat]}>
                    <View style={styles.userMarker} />
                  </MapplsGL.PointAnnotation>
                )}
                
                {formData.latitude && formData.longitude && (
                  <MapplsGL.PointAnnotation 
                    id="picker-loc" 
                    coordinate={[parseFloat(formData.longitude), parseFloat(formData.latitude)]}
                  >
                    <View style={styles.pickerMarker} />
                  </MapplsGL.PointAnnotation>
                )}
              </MapplsGL.MapView>
            </View>

            <View style={{flexDirection: 'row', gap: SIZES.md}}>
              <View style={{flex: 1}}>
                <Text style={styles.label}>Latitude</Text>
                <TextInput style={[styles.input, styles.inputDisabled]} editable={false} placeholder="-" value={formData.latitude} />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.label}>Longitude</Text>
                <TextInput style={[styles.input, styles.inputDisabled]} editable={false} placeholder="-" value={formData.longitude} />
              </View>
            </View>
          </View>

          <Separator style={styles.sep} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Capacity & Timing</Text>

          <View style={{flexDirection: 'row', gap: SIZES.md}}>
            <View style={{flex: 1}}>
              <Text style={styles.label}>Total Capacity</Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. 50" 
                keyboardType="number-pad"
                placeholderTextColor={COLORS.textDisabled}
                value={formData.total_capacity}
                onChangeText={(v) => setFormData({...formData, total_capacity: v})}
              />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.label}>Price per Hour (₹)</Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. 50" 
                keyboardType="number-pad"
                placeholderTextColor={COLORS.textDisabled}
                value={formData.hourly_price}
                onChangeText={(v) => setFormData({...formData, hourly_price: v})}
              />
            </View>
          </View>

          <Text style={styles.label}>Visibility Range in Customer App (km)</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. 10" 
            keyboardType="number-pad"
            placeholderTextColor={COLORS.textDisabled}
            value={formData.visibility_range_km}
            onChangeText={(v) => setFormData({...formData, visibility_range_km: v})}
          />

            <View style={{flexDirection: 'row', gap: SIZES.md}}>
              <View style={{flex: 1}}>
                <Text style={styles.label}>Opening Time</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="06:00:00" 
                  placeholderTextColor={COLORS.textDisabled}
                  value={formData.opening_time}
                  onChangeText={(v) => setFormData({...formData, opening_time: v})}
                />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.label}>Closing Time</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="23:00:00" 
                  placeholderTextColor={COLORS.textDisabled}
                  value={formData.closing_time}
                  onChangeText={(v) => setFormData({...formData, closing_time: v})}
                />
              </View>
            </View>
          </View>

          <Button variant="primary" onPress={handleCreate} isDisabled={loading} style={styles.createBtn}>
            <View style={styles.btnInner}>
              <AppIcon name="checkmark-circle-outline" size={18} color={COLORS.white} />
              <Text style={styles.createBtnText}>{loading ? 'Creating...' : 'Create Parking Lot'}</Text>
            </View>
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    paddingHorizontal: SIZES.lg, paddingTop: 56, paddingBottom: SIZES.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  
  content: { padding: SIZES.lg, paddingBottom: 100 },
  section: { gap: SIZES.sm },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  hintTxt: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  sep: { marginVertical: SIZES.lg },
  
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginTop: 4 },
  input: {
    backgroundColor: COLORS.surface, color: COLORS.text, fontSize: 15,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radiusSm,
    paddingHorizontal: SIZES.md, height: 48,
  },
  inputDisabled: { backgroundColor: COLORS.background, color: COLORS.textMuted },
  
  mapWrap: { height: 200, borderRadius: SIZES.radius, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  map: { flex: 1 },
  userMarker: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#0EA5E9', borderWidth: 2, borderColor: '#fff' },
  pickerMarker: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#2563EB', borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity:0.3, shadowRadius:4, elevation:4 },
  
  createBtn: { marginTop: SIZES.md, height: 52, borderRadius: SIZES.radiusMd },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  createBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' }
});
