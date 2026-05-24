import "react-native-gesture-handler";
import "./global.css";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { colors } from "./src/constants/theme";
import {
  AccessManagementScreen,
  AddBirthdayScreen,
  AddPassingAnniversaryScreen,
  AddPersonScreen,
  AddWeddingAnniversaryScreen,
  AuthScreen,
  DashboardScreen,
  InviteAcceptScreen,
  NoWorkspaceScreen,
  PeopleDirectoryScreen,
  PersonProfileScreen,
  PublicFamilyFormScreen,
  RelationshipLinkingScreen,
  ReminderSettingsScreen,
  SettingsScreen,
  SubmissionInboxScreen,
  SuperAdminDashboardScreen,
  UpcomingRemindersScreen,
  WorkspacePickerScreen,
  tabIcons
} from "./src/app/screens";

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const Icon = tabIcons[route.name as keyof typeof tabIcons];
        return {
          headerShown: false,
          tabBarActiveTintColor: colors.goldDark,
          tabBarInactiveTintColor: colors.mutedGrey,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            minHeight: 76,
            paddingBottom: 14,
            paddingTop: 10
          },
          tabBarLabelStyle: {
            fontFamily: "Didact Gothic",
            fontSize: 12
          },
          tabBarIcon: ({ color, size }) => (Icon ? <Icon color={color} size={size} /> : null)
        };
      }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Contacts" component={PeopleDirectoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer
      linking={{
        prefixes: ["yaadi://", "https://yaadi-five.vercel.app"],
        config: {
          screens: {
            PublicFamilyForm: "family/:token",
            InviteAccept: "invite/:token"
          }
        }
      }}
    >
      <StatusBar style="dark" />
      <RootStack.Navigator
        initialRouteName="Auth"
        screenOptions={{
          headerStyle: { backgroundColor: colors.ivory },
          headerTintColor: colors.goldDark,
          headerTitleStyle: {
            fontFamily: "Cormorant Garamond",
            fontSize: 25,
            fontWeight: "600"
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.ivory }
        }}
      >
        <RootStack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="NoWorkspace" component={NoWorkspaceScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="WorkspacePicker" component={WorkspacePickerScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <RootStack.Screen name="PeopleDirectory" component={PeopleDirectoryScreen} options={{ title: "People" }} />
        <RootStack.Screen name="PersonProfile" component={PersonProfileScreen} options={{ title: "Profile" }} />
        <RootStack.Screen name="AddPerson" component={AddPersonScreen} options={{ title: "Add Contact" }} />
        <RootStack.Screen name="AddBirthday" component={AddBirthdayScreen} options={{ title: "Birthday" }} />
        <RootStack.Screen name="AddPassingAnniversary" component={AddPassingAnniversaryScreen} options={{ title: "Anniversary" }} />
        <RootStack.Screen name="AddWeddingAnniversary" component={AddWeddingAnniversaryScreen} options={{ title: "Wedding Anniversary" }} />
        <RootStack.Screen name="UpcomingReminders" component={UpcomingRemindersScreen} options={{ title: "Upcoming reminders" }} />
        <RootStack.Screen name="ReminderSettings" component={ReminderSettingsScreen} options={{ title: "Reminder settings" }} />
        <RootStack.Screen name="RelationshipLinking" component={RelationshipLinkingScreen} options={{ title: "Relationships" }} />
        <RootStack.Screen name="AccessManagement" component={AccessManagementScreen} options={{ title: "Access" }} />
        <RootStack.Screen name="SubmissionInbox" component={SubmissionInboxScreen} options={{ title: "Submissions" }} />
        <RootStack.Screen name="SuperAdminDashboard" component={SuperAdminDashboardScreen} options={{ title: "Super admin" }} />
        <RootStack.Screen name="PublicFamilyForm" component={PublicFamilyFormScreen} options={{ title: "Family details" }} />
        <RootStack.Screen name="InviteAccept" component={InviteAcceptScreen} options={{ title: "Invitation" }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
