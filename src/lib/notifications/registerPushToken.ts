import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "../supabase/client";

export async function registerWorkspacePushToken(input: {
  userId: string;
  workspaceId: string;
}): Promise<string> {
  if (Platform.OS === "web") {
    throw new Error("Expo push tokens are registered from an iOS or Android device build.");
  }

  if (!Device.isDevice) {
    throw new Error("Use a physical device to register push notifications.");
  }

  const existing = await Notifications.getPermissionsAsync() as unknown as { granted: boolean };
  const permission = existing.granted
    ? existing
    : await Notifications.requestPermissionsAsync() as unknown as { granted: boolean };
  if (!permission.granted) {
    throw new Error("Push notification permission was not granted.");
  }

  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    throw new Error("Set EXPO_PUBLIC_EAS_PROJECT_ID before registering Expo push tokens.");
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { error } = await supabase.from("notification_tokens").upsert(
    {
      user_id: input.userId,
      workspace_id: input.workspaceId,
      token,
      platform: Platform.OS
    },
    { onConflict: "user_id,workspace_id,token" }
  );
  if (error) {
    throw error;
  }

  return token;
}
