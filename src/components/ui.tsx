import { ReactNode } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { colors } from "../constants/theme";

export function Screen(props: { title?: string; subtitle?: string; eyebrow?: string; children: ReactNode }) {
  return (
    <ScrollView className="flex-1 bg-ivory" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {props.title ? (
        <View className="pt-2">
          {props.eyebrow ? <Text className="font-body text-sm uppercase text-grey-dark">{props.eyebrow}</Text> : null}
          <Text className="mt-2 font-heading text-[36px] font-semibold leading-[40px] text-deep-charcoal">{props.title}</Text>
          {props.subtitle ? <Text className="mt-2 max-w-[560px] font-body text-lg leading-7 text-charcoal-light">{props.subtitle}</Text> : null}
          <View className="mt-5 h-px w-16 bg-muted-gold" />
        </View>
      ) : null}
      <View className={props.title ? "mt-6" : ""}>{props.children}</View>
    </ScrollView>
  );
}

export function Card(props: { children: ReactNode; accent?: string; padded?: boolean }) {
  return (
    <View
      className={`mb-4 rounded-card border bg-cream ${props.padded === false ? "" : "p-6"}`}
      style={{
        borderColor: props.accent ?? colors.border,
        shadowColor: colors.deepCharcoal,
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2
      }}
    >
      {props.children}
    </View>
  );
}

export function PrimaryButton(props: { label: string; onPress?: () => void; tone?: "gold" | "green" | "purple" }) {
  const backgroundColor =
    props.tone === "green" ? colors.waras : props.tone === "purple" ? colors.passing : colors.mutedGold;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      className="min-h-[56px] items-center justify-center rounded-button px-8"
      style={{
        backgroundColor,
        shadowColor: colors.deepCharcoal,
        shadowOpacity: 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
        transform: Platform.OS === "web" ? [{ translateY: -1 }] : undefined
      }}
    >
      <Text className="font-body text-base font-medium text-ivory">{props.label}</Text>
    </Pressable>
  );
}

export function QuietButton(props: { label: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      className="min-h-[56px] items-center justify-center rounded-button border border-grey-medium bg-warm-beige px-6"
    >
      <Text className="font-body text-base font-medium text-deep-charcoal">{props.label}</Text>
    </Pressable>
  );
}

export function StatPill(props: { label: string; value: string | number }) {
  return (
    <View className="mr-2 mt-2 min-w-[80px] rounded-input border border-line bg-grey-light px-3 py-3">
      <Text className="font-body text-xs uppercase text-grey-dark">{props.label}</Text>
      <Text className="mt-1 font-heading text-2xl font-semibold leading-7 text-deep-charcoal">{props.value}</Text>
    </View>
  );
}

export function FieldPreview(props: { label: string; value: string }) {
  return (
    <View className="mb-4">
      <Text className="mb-2 font-body text-sm font-medium text-charcoal-light">{props.label}</Text>
      <View className="min-h-[52px] justify-center rounded-input border border-grey-medium bg-grey-light px-5 py-3">
        <Text className="font-body text-base text-deep-charcoal">{props.value}</Text>
      </View>
    </View>
  );
}

export function SectionTitle(props: { children: ReactNode }) {
  return (
    <View className="mb-4 mt-3 flex-row items-center">
      <Text className="font-heading text-[28px] font-medium leading-8 text-deep-charcoal">{props.children}</Text>
      <View className="ml-3 h-px flex-1 bg-line" />
    </View>
  );
}

export function ReminderCard(props: {
  name: string;
  title: string;
  detail: string;
  tone?: "birthday" | "waras" | "passing";
}) {
  const accent =
    props.tone === "waras" ? colors.waras : props.tone === "passing" ? colors.passing : colors.birthday;

  return (
    <View
      className="mb-4 rounded-card border border-line bg-cream p-5"
      style={{
        borderLeftColor: accent,
        borderLeftWidth: 4,
        shadowColor: colors.deepCharcoal,
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2
      }}
    >
      <Text className="font-body text-xs uppercase text-grey-dark">{props.title}</Text>
      <Text className="mt-2 font-heading text-[26px] font-medium leading-7 text-deep-charcoal">{props.name}</Text>
      <Text className="mt-2 font-body text-base leading-6 text-charcoal-light">{props.detail}</Text>
    </View>
  );
}

export function Badge(props: { label: string; tone?: "gold" | "waras" | "passing" }) {
  const backgroundColor =
    props.tone === "waras"
      ? "rgba(31, 122, 92, 0.12)"
      : props.tone === "passing"
        ? "rgba(111, 91, 143, 0.12)"
        : "rgba(201, 169, 97, 0.16)";
  const color = props.tone === "waras" ? colors.waras : props.tone === "passing" ? colors.passing : colors.goldDark;

  return (
    <View className="self-start rounded-full px-3 py-1.5" style={{ backgroundColor }}>
      <Text className="font-body text-xs uppercase" style={{ color }}>
        {props.label}
      </Text>
    </View>
  );
}
