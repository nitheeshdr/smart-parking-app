import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button, Separator } from 'heroui-native';
import { supabase } from '../../../../lib/supabase';
import { AppIcon } from '../../../../components/app-icon';
import { COLORS, SIZES } from '../../../../constants/theme';
import { useQueryClient } from '@tanstack/react-query';
import MapplsGL from 'mappls-map-react-native';

export default function EditLotScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    pincode: '',
    opening_time: '',
    closing_time: '',
    total_capacity: '',
    latitude: '',
    longitude: ''
  });
  
  const [initialLat, setInitialLat] = useState(0);
  const [initialLng, setInitialLng] = useState(0);

  const fetchLot = async () => {
    try {
      const { data, error } = await supabase
        .from('parking_lots')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      if (data) {
        setFormData({
          name: data.name,
          address: data.address,
          city: data.city,
          pincode: data.pincode,
          opening_time: data.opening_time,
          closing_time: data.closing_time,
          total_capacity: data.total_capacity.toString(),
          latitude: data.latitude.toString(),
          longitude: data.longitude.toString()
        });
        setInitialLat(data.latitude);
        setInitialLng(data.longitude);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLot();
  }, [id]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const lat = Number(formData.latitude);
      const lng = Number(formData.longitude);

      const { error } = await supabase
        .from('parking_lots')
        .update({
          name: formData.name,
          address: formData.address,
          city: formData.city,
          pincode: formData.pincode,
          opening_time: formData.opening_time,
          closing_time: formData.closing_time,
          total_capacity: parseInt(formData.total_capacity) || 0,
          latitude: lat,
          longitude: lng,
        })
        .eq('id', id);

      if (error) throw error;
      
      Alert.alert('Success', 'Parking lot updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['manager_lots'] });
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary}/></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button variant="flat" size="sm" onPress={() => router.back()} style={styles.backBtn}>
          <AppIcon name="chevron-back" size={20} color={COLORS.text} />
        </Button>
        <Text style={styles.title}>Edit Lot</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lot Details</Text>
            
            <Text style={styles.label}>Lot Name</Text>
            <TextInput 
              style={styles.input}
              value={formData.name}
              onChangeText={(v) => setFormData({...formData, name: v})}
            />

            <Text style={styles.label}>Address</Text>
            <TextInput 
              style={styles.input}
              value={formData.address}
              onChangeText={(v) => setFormData({...formData, address: v})}
            />

            <View style={{flexDirection: 'row', gap: SIZES.md}}>
              <View style={{flex: 1}}>
                <Text style={styles.label}>City</Text>
                <TextInput 
                  style={styles.input}
                  value={formData.city}
                  onChangeText={(v) => setFormData({...formData, city: v})}
                />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.label}>Pincode</Text>
                <TextInput 
                  style={styles.input}
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
                  zoomLevel={14}
                  centerCoordinate={[initialLng || 77.5946, initialLat || 12.9716]}
                />
                
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
                <TextInput style={[styles.input, styles.inputDisabled]} editable={false} value={formData.latitude} />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.label}>Longitude</Text>
                <TextInput style={[styles.input, styles.inputDisabled]} editable={false} value={formData.longitude} />
              </View>
            </View>
          </View>

          <Separator style={styles.sep} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Capacity & Timing</Text>

            <Text style={styles.label}>Total Capacity</Text>
            <TextInput 
              style={styles.input}
              keyboardType="number-pad"
              value={formData.total_capacity}
              onChangeText={(v) => setFormData({...formData, total_capacity: v})}
            />

            <View style={{flexDirection: 'row', gap: SIZES.md}}>
              <View style={{flex: 1}}>
                <Text style={styles.label}>Opening Time</Text>
                <TextInput 
                  style={styles.input}
                  value={formData.opening_time}
                  onChangeText={(v) => setFormData({...formData, opening_time: v})}
                />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.label}>Closing Time</Text>
                <TextInput 
                  style={styles.input}
                  value={formData.closing_time}
                  onChangeText={(v) => setFormData({...formData, closing_time: v})}
                />
              </View>
            </View>
          </View>

          <Button variant="primary" onPress={handleUpdate} isDisabled={saving} style={styles.createBtn}>
            <View style={styles.btnInner}>
              <AppIcon name="checkmark-circle-outline" size={18} color={COLORS.white} />
              <Text style={styles.createBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
            </View>
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  pickerMarker: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#2563EB', borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity:0.3, shadowRadius:4, elevation:4 },
  
  createBtn: { marginTop: SIZES.md, height: 52, borderRadius: SIZES.radiusMd },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  createBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' }
});
