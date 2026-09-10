import { StyleSheet, Text, View } from 'react-native';
function Header() {

  return (
    <View style={styles.headerContainer}>
      <Text style={styles.text}>Header</Text>
    </View>
  )
}

export default Header

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#181616',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    height: '13%',
    opacity: .8
  },
  text: {
    color: '#ffffff',
    fontSize: 48,
    // fontWeight: 'bold',
  },
});