import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSos } from '../contexts/SosContext';

const ControlTimeModal = ({
  visible,
  onClose,
  routeId,
  initialData = {},
  onSave,
}) => {
  // тут логируем рендер модалки для отладки
  console.log('DEBUG: ControlTimeModal rendered with visible:', visible);
  const { scheduleControl } = useSos();

  // Form state
  const [etaType, setEtaType] = useState('relative'); // 'absolute' or 'relative'
  const [absoluteEta, setAbsoluteEta] = useState(new Date(Date.now() + 3 * 60 * 60 * 1000)); // 3 hours from now
  const [relativeHours, setRelativeHours] = useState('3');
  const [relativeMinutes, setRelativeMinutes] = useState('0');
  const [gracePeriod, setGracePeriod] = useState('5'); // minutes
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setEtaType('relative');
    setAbsoluteEta(new Date(Date.now() + 3 * 60 * 60 * 1000));
    setRelativeHours('3');
    setRelativeMinutes('0');
    setGracePeriod('5');
    setContacts(initialData.contacts || []);
    setNewContact('');
  };

  // Calculate ETA based on type
  const getCalculatedEta = () => {
    if (etaType === 'absolute') {
      return absoluteEta.getTime();
    } else {
      const hours = parseInt(relativeHours) || 0;
      const minutes = parseInt(relativeMinutes) || 0;
      return Date.now() + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
    }
  };

  // Handle date picker change
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setAbsoluteEta(selectedDate);
    }
  };

  // Add contact
  const addContact = () => {
    if (!newContact.trim()) return;

    // Basic validation
    const contact = newContact.trim();
    if (contacts.includes(contact)) {
      Alert.alert('Duplicate Contact', 'This contact is already added.');
      return;
    }

    setContacts([...contacts, contact]);
    setNewContact('');
  };

  // Remove contact
  const removeContact = (index) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  // Handle save
  const handleSave = async () => {
    const eta = getCalculatedEta();
    const gracePeriodMinutes = parseInt(gracePeriod) || 5;

    // Validation
    if (eta <= Date.now()) {
      Alert.alert('Invalid Time', 'Control time must be in the future.');
      return;
    }

    if (gracePeriodMinutes < 5 || gracePeriodMinutes > 60) {
      Alert.alert('Invalid Grace Period', 'Grace period must be between 5 and 60 minutes.');
      return;
    }

    try {
      const controlTime = await scheduleControl(routeId, eta, {
        gracePeriod: gracePeriodMinutes * 60 * 1000,
        contacts,
      });

      Alert.alert(
        'Control Time Set',
        `Control time scheduled for ${new Date(eta).toLocaleString()}`,
        [{ text: 'OK', onPress: () => { onClose(); if (onSave) onSave(); } }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to schedule control time. Please try again.');
    }
  };

  const etaPreview = new Date(getCalculatedEta()).toLocaleString();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      style={{ zIndex: 2000 }}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Set Control Time</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* ETA Type Selection */}
            <Text style={styles.sectionTitle}>Control Time Type</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, etaType === 'relative' && styles.typeButtonActive]}
                onPress={() => setEtaType('relative')}
              >
                <Text style={[styles.typeButtonText, etaType === 'relative' && styles.typeButtonTextActive]}>
                  Relative Time
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, etaType === 'absolute' && styles.typeButtonActive]}
                onPress={() => setEtaType('absolute')}
              >
                <Text style={[styles.typeButtonText, etaType === 'absolute' && styles.typeButtonTextActive]}>
                  Absolute Time
                </Text>
              </TouchableOpacity>
            </View>

            {/* ETA Input */}
            <Text style={styles.sectionTitle}>Control Time</Text>
            {etaType === 'relative' ? (
              <View style={styles.relativeTimeContainer}>
                <View style={styles.timeInputGroup}>
                  <TextInput
                    style={styles.timeInput}
                    value={relativeHours}
                    onChangeText={setRelativeHours}
                    placeholder="3"
                    keyboardType="numeric"
                    maxLength={2}
                  />
                  <Text style={styles.timeLabel}>hours</Text>
                </View>
                <View style={styles.timeInputGroup}>
                  <TextInput
                    style={styles.timeInput}
                    value={relativeMinutes}
                    onChangeText={setRelativeMinutes}
                    placeholder="30"
                    keyboardType="numeric"
                    maxLength={2}
                  />
                  <Text style={styles.timeLabel}>minutes</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {absoluteEta.toLocaleString()}
                </Text>
              </TouchableOpacity>
            )}

            {/* Date Picker */}
            {showDatePicker && (
              <DateTimePicker
                value={absoluteEta}
                mode="datetime"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            {/* ETA Preview */}
            <Text style={styles.previewText}>Will trigger at: {etaPreview}</Text>

            {/* Grace Period */}
            <Text style={styles.sectionTitle}>Grace Period (minutes)</Text>
            <TextInput
              style={styles.input}
              value={gracePeriod}
              onChangeText={setGracePeriod}
              placeholder="5"
              keyboardType="numeric"
              maxLength={2}
            />
            <Text style={styles.hintText}>
              If not acknowledged within this time, SOS will be sent automatically.
            </Text>

            {/* Emergency Contacts */}
            <Text style={styles.sectionTitle}>Emergency Contacts (Optional)</Text>
            <View style={styles.contactsContainer}>
              {contacts.map((contact, index) => (
                <View key={index} style={styles.contactItem}>
                  <Text style={styles.contactText}>{contact}</Text>
                  <TouchableOpacity
                    onPress={() => removeContact(index)}
                    style={styles.removeContact}
                  >
                    <Text style={styles.removeText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.addContactContainer}>
                <TextInput
                  style={styles.contactInput}
                  value={newContact}
                  onChangeText={setNewContact}
                  placeholder="Phone number or contact name"
                  onSubmitEditing={addContact}
                />
                <TouchableOpacity onPress={addContact} style={styles.addButton}>
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.hintText}>
              These contacts will be notified if SOS is triggered.
            </Text>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Set Control Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 2000, // Higher z-index to ensure it's on top
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    zIndex: 2001, // Even higher z-index for the modal itself
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 5,
  },
  closeText: {
    fontSize: 18,
    color: '#6b7280',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  relativeTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInputGroup: {
    flex: 1,
    alignItems: 'center',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    width: '100%',
  },
  timeLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#374151',
  },
  previewText: {
    fontSize: 14,
    color: '#059669',
    marginTop: 8,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  hintText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  contactsContainer: {
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#374151',
  },
  removeContact: {
    padding: 4,
  },
  removeText: {
    fontSize: 14,
    color: '#ef4444',
  },
  addContactContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  contactInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default ControlTimeModal;