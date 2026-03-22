import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BuyerProductDetailScreen from '../screens/BuyerProductDetailScreen';
import CheckoutOrderScreen from '../screens/CheckoutOrderScreen';
import FarmerOrderDetailScreen from '../screens/FarmerOrderDetailScreen';
import FarmerOrdersScreen from '../screens/FarmerOrdersScreen';
import FarmerReferencePricesScreen from '../screens/FarmerReferencePricesScreen';
import HomeScreen from '../screens/HomeScreen';
import MarketScreen from '../screens/MarketScreen';
import MyOrdersScreen from '../screens/MyOrdersScreen';
import ProductScreen from '../screens/ProductScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#2E7D32' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen
        name="Inicio"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Productos"
        component={ProductScreen}
        options={{ title: '🌽 Mis productos' }}
      />
      <Stack.Screen
        name="Mercado"
        component={MarketScreen}
        options={{ title: '🌽 Mercado' }}
      />
      <Stack.Screen
        name="DetalleCompra"
        component={BuyerProductDetailScreen}
        options={{ title: 'Producto' }}
      />
      <Stack.Screen
        name="PagoPedido"
        component={CheckoutOrderScreen}
        options={{ title: 'Pago del pedido' }}
      />
      <Stack.Screen
        name="MisPedidos"
        component={MyOrdersScreen}
        options={{ title: '📦 Mis pedidos' }}
      />
      <Stack.Screen
        name="PedidosRecibidos"
        component={FarmerOrdersScreen}
        options={{ title: '🛒 Pedidos recibidos' }}
      />
      <Stack.Screen
        name="PreciosReferencia"
        component={FarmerReferencePricesScreen}
        options={{ title: '📊 Precios de referencia' }}
      />
      <Stack.Screen
        name="DetallePedidoAgricultor"
        component={FarmerOrderDetailScreen}
        options={{ title: 'Detalle del pedido' }}
      />
    </Stack.Navigator>
  );
}
