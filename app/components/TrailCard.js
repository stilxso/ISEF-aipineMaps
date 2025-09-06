import { memo } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const TrailCard = memo(({ name, difficulty, onPress }) => {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={styles.container}
      activeOpacity={0.7}
    >
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.difficulty}>
        Сложность: {difficulty}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  difficulty: {
    color: '#6b7280',
    marginTop: 4,
    fontSize: 14,
  },
});

TrailCard.displayName = 'TrailCard';

export default TrailCard;