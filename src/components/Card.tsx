import { StyleSheet, Text, View } from 'react-native';
function Card() {

  return (
    <View style={styles.card}>
      <Text style={styles.text}>Card</Text>
    </View>
  )
}

export default Card

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#94c975',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 180,
    height: 180,
    opacity: .8,
    borderRadius: 20,
    justifyContent: 'center'
  },
  text: {
    color: '#ffffff',
    fontSize: 48,
    // fontWeight: 'bold',
  },
});