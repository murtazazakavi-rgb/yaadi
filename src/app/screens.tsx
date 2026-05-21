import { Pressable, Text, View } from "react-native";
import {
  BellRing,
  CalendarDays,
  CalendarPlus,
  Crown,
  Heart,
  Home,
  Link2,
  Lock,
  Settings,
  ShieldCheck,
  UserRoundPlus,
  Users,
  WalletCards
} from "lucide-react-native";
import { APP_NAME, APP_TAGLINE, importantDateLabels, passingDateLabel } from "../constants/copy";
import { colors } from "../constants/theme";
import { Badge, Card, FieldPreview, PrimaryButton, QuietButton, ReminderCard, Screen, SectionTitle, StatPill } from "../components/ui";
import { useYaadiStore } from "./store";
import {
  calculateGregorianAge,
  calculateHijriAge,
  calculateYearsSincePassing,
  formatHijriDayMonth,
  getNextHijriBirthdayWarasOccurrence,
  gregorianToHijri,
  makeLocalDate
} from "../lib/calendar/dateConversion";
import { evaluateSubscriptionGate } from "../lib/subscriptions/enforcement";
import { getPersonDisplayName } from "../lib/reminders/reminderEngine";

type NavProps = {
  navigation: {
    navigate: (screen: string, params?: unknown) => void;
    replace?: (screen: string) => void;
    goBack?: () => void;
  };
};

export function SplashScreen({ navigation }: NavProps) {
  return (
    <View className="flex-1 justify-between bg-ivory px-8 py-10">
      <View className="items-center pt-12">
        <View className="h-px w-20 bg-muted-gold" />
        <View className="mt-18 h-28 w-28 items-center justify-center rounded-full border border-line bg-cream shadow-soft">
          <View className="h-[88px] w-[88px] items-center justify-center rounded-full border border-gold-light bg-grey-light">
            <Heart color={colors.goldDark} size={34} strokeWidth={1.8} />
          </View>
        </View>
        <Text className="mt-10 font-heading text-[58px] font-semibold leading-[60px] text-deep-charcoal">{APP_NAME}</Text>
        <Text className="mt-3 max-w-[320px] text-center font-body text-lg leading-7 text-charcoal-light">{APP_TAGLINE}</Text>
      </View>
      <View>
        <PrimaryButton label="Continue" onPress={() => navigation.replace?.("Auth")} />
        <Text className="mt-5 text-center font-body text-sm text-grey-dark">Private reminders for the people you hold close.</Text>
      </View>
    </View>
  );
}

export function AuthScreen({ navigation }: NavProps) {
  return (
    <Screen eyebrow="Private workspace" title="Welcome to Yaadi" subtitle={APP_TAGLINE}>
      <Card>
        <Badge label="Family access" />
        <Text className="mb-5 mt-4 font-heading text-[28px] font-medium leading-8 text-deep-charcoal">Sign in to your family space</Text>
        <FieldPreview label="Email" value="fatema@example.com" />
        <FieldPreview label="Password" value="••••••••" />
        <PrimaryButton label="Login / Signup" onPress={() => navigation.replace?.("CreateWorkspace")} />
      </Card>
      <Text className="mt-3 text-center font-body text-sm leading-6 text-grey-dark">Private family records. Workspace-based access. Respectful reminders.</Text>
    </Screen>
  );
}

export function CreateWorkspaceScreen({ navigation }: NavProps) {
  return (
    <Screen eyebrow="Step 1" title="Create family workspace" subtitle="Start with your family, then add people and their important dates.">
      <Card>
        <Badge label="14 day trial" />
        <Text className="mb-5 mt-4 font-heading text-[28px] font-medium leading-8 text-deep-charcoal">A calm home for family dates</Text>
        <FieldPreview label="Workspace name" value="Murtaza Family" />
        <FieldPreview label="Trial access" value="Up to 10 people" />
        <PrimaryButton label="Create workspace" onPress={() => navigation.replace?.("Main")} />
      </Card>
    </Screen>
  );
}

export function DashboardScreen({ navigation }: NavProps) {
  const { workspace, people, importantDates, plans } = useYaadiStore();
  const plan = plans.find((item) => item.id === workspace.planId);
  const gate = evaluateSubscriptionGate({ workspace, plan, peopleCount: people.length, adminsCount: 1 });

  return (
    <Screen eyebrow={`${workspace.name} · ${plan?.name ?? "Family Plus"} Trial`} title={APP_NAME} subtitle="A private reminder desk for every person and every special date.">
      <Card accent={colors.goldLight}>
        <View className="flex-row items-start justify-between">
          <View className="h-14 w-14 items-center justify-center rounded-input bg-grey-light">
            <Home color={colors.goldDark} size={24} strokeWidth={1.8} />
          </View>
          <Badge label="Trial active" />
        </View>
        <View className="mt-6">
          <Text className="font-heading text-[32px] font-semibold leading-9 text-deep-charcoal">Your Yaadi calendar is active</Text>
          <Text className="mt-2 font-body text-base leading-6 text-charcoal-light">People first. Dates and reminders follow them.</Text>
        </View>
        <View className="mt-4 flex-row flex-wrap">
          <StatPill label="People" value={people.length} />
          <StatPill label="Dates" value={importantDates.length} />
          <StatPill label="Upcoming" value={3} />
        </View>
        {gate.showUpgradeCta ? <Text className="mt-4 font-body text-sm text-gold-dark">{gate.reason}</Text> : null}
      </Card>

      <SectionTitle>Upcoming reminders</SectionTitle>
      <ReminderPreview name="Fatema Ben" title="Birthday" text="In 7 days. She will turn 31." />
      <ReminderPreview name="Husain Bhai" title="Hijri Birthday (Waras)" text="In 2 days - 8 Rajab ul Asab." tone="waras" />
      <ReminderPreview name="Marhoom Abbas Bhai" title="Anniversary of their passing" text="Tomorrow. Years since passing: 6." tone="passing" />

      <SectionTitle>Quick actions</SectionTitle>
      <View className="flex-row flex-wrap justify-between">
        <QuickAction icon={UserRoundPlus} label="Add Person" onPress={() => navigation.navigate("AddPerson")} />
        <QuickAction icon={Users} label="View People" onPress={() => navigation.navigate("PeopleDirectory")} />
        <QuickAction icon={CalendarPlus} label="Add Date" onPress={() => navigation.navigate("AddBirthday")} />
        <QuickAction icon={Link2} label="Relations" onPress={() => navigation.navigate("RelationshipLinking")} />
        <QuickAction icon={ShieldCheck} label="Access" onPress={() => navigation.navigate("AccessManagement")} />
        <QuickAction icon={WalletCards} label="Plans" onPress={() => navigation.navigate("SubscriptionPlans")} />
      </View>
    </Screen>
  );
}

export function PeopleDirectoryScreen({ navigation }: NavProps) {
  const { people, setSelectedPersonId } = useYaadiStore();

  return (
    <Screen eyebrow="People first" title="People directory" subtitle="Manage people first, then attach their dates and reminders.">
      {people.map((person) => (
        <Card key={person.id}>
          <View className="flex-row items-start justify-between">
            <View className="h-12 w-12 items-center justify-center rounded-input bg-grey-light">
              <Users color={colors.goldDark} size={21} strokeWidth={1.8} />
            </View>
            <Badge label={person.livingStatus === "living" ? "Living" : "Deceased"} tone={person.livingStatus === "living" ? "gold" : "passing"} />
          </View>
          <Text className="mt-5 font-heading text-[30px] font-medium leading-8 text-deep-charcoal">{getPersonDisplayName(person)}</Text>
          <Text className="mt-2 font-body text-sm text-grey-dark">{person.familyGroup ?? "Family"} family group</Text>
          <View className="mt-5">
            <QuietButton
              label="Open profile"
              onPress={() => {
                setSelectedPersonId(person.id);
                navigation.navigate("PersonProfile");
              }}
            />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

export function PersonProfileScreen({ navigation }: NavProps) {
  const { people, importantDates, selectedPersonId } = useYaadiStore();
  const person = people.find((item) => item.id === selectedPersonId) ?? people[0];
  const dates = importantDates.filter((item) => item.personId === person.id);

  return (
    <Screen eyebrow="Person profile" title={getPersonDisplayName(person)} subtitle="Profile, dates, reminders, and relationships.">
      <Card accent={colors.goldLight}>
        <View className="flex-row items-center justify-between">
          <Badge label={person.livingStatus === "living" ? "Living" : "Deceased"} tone={person.livingStatus === "living" ? "gold" : "passing"} />
          <Text className="font-body text-sm text-grey-dark">{person.familyGroup ?? "Family"}</Text>
        </View>
        <Text className="mt-6 font-body text-base leading-6 text-charcoal-light">Add important dates directly to this person so the reminder timeline stays personal.</Text>
      </Card>
      <SectionTitle>Important dates</SectionTitle>
      {dates.map((date) => (
        <ReminderCard
          key={date.id}
          name={importantDateLabels[date.type]}
          title={date.type === "passing_anniversary" ? "Remembrance" : "Important date"}
          detail={describeImportantDate(date)}
          tone={date.type === "hijri_birthday_waras" ? "waras" : date.type === "passing_anniversary" ? "passing" : "birthday"}
        />
      ))}
      <View className="gap-3">
        <PrimaryButton label="Add Birthday" onPress={() => navigation.navigate("AddBirthday")} />
        <PrimaryButton label="Add Hijri Birthday (Waras)" tone="green" onPress={() => navigation.navigate("AddHijriBirthdayWaras")} />
        <PrimaryButton label="Add Anniversary of their passing" tone="purple" onPress={() => navigation.navigate("AddPassingAnniversary")} />
      </View>
    </Screen>
  );
}

export function AddPersonScreen() {
  return (
    <Screen eyebrow="Add Person" title="Start with a person" subtitle="Create the family member first. Dates come next.">
      <Card>
        <Text className="mb-5 font-heading text-[28px] font-medium leading-8 text-deep-charcoal">Person details</Text>
        <FieldPreview label="First name" value="Fatema" />
        <FieldPreview label="Middle name" value="Optional" />
        <FieldPreview label="Last name" value="Ben" />
        <FieldPreview label="Living status" value="Living" />
        <FieldPreview label="Mobile" value="Optional" />
        <FieldPreview label="Email" value="Optional" />
        <FieldPreview label="Family group" value="Ahmedabad" />
        <PrimaryButton label="Save person" />
      </Card>
    </Screen>
  );
}

export function AddBirthdayScreen({ navigation }: NavProps) {
  return (
    <Screen eyebrow="Important date" title="Add Birthday" subtitle="Set the Gregorian birthday and reminder days.">
      <Card>
        <Badge label="Gregorian" />
        <Text className="mb-5 mt-4 font-heading text-[28px] font-medium leading-8 text-deep-charcoal">Birthday details</Text>
        <FieldPreview label="Person" value="Fatema Ben" />
        <FieldPreview label="Gregorian date of birth" value="29 May 1995" />
        <FieldPreview label="Show year" value="Yes" />
        <FieldPreview label="Reminder days" value="7, 5, 2, 1, same day" />
        <PrimaryButton label="Save Birthday" onPress={() => navigation.navigate("UpcomingReminders")} />
      </Card>
    </Screen>
  );
}

export function AddHijriBirthdayWarasScreen({ navigation }: NavProps) {
  return (
    <Screen eyebrow="Important date" title="Add Hijri Birthday (Waras)" subtitle="Set the Hijri date using the Mumineen Calendar conversion.">
      <Card accent={colors.hijriGreen}>
        <Badge label="Hijri date" tone="waras" />
        <Text className="mb-5 mt-4 font-heading text-[28px] font-medium leading-8 text-deep-charcoal">Hijri Birthday (Waras) details</Text>
        <FieldPreview label="Person" value="Husain Bhai" />
        <FieldPreview label="Hijri day" value="8" />
        <FieldPreview label="Hijri month" value="Rajab al-Asab" />
        <FieldPreview label="Hijri year" value="Optional" />
        <FieldPreview label="Source" value="Confirmed" />
        <FieldPreview label="Reminder days" value="7, 5, 2, 1, same day" />
        <PrimaryButton label="Save Hijri Birthday (Waras)" tone="green" onPress={() => navigation.navigate("UpcomingReminders")} />
      </Card>
    </Screen>
  );
}

export function AddPassingAnniversaryScreen({ navigation }: NavProps) {
  return (
    <Screen eyebrow="Important date" title="Add Anniversary of their passing" subtitle="Set Date of Passing by Gregorian date, Hijri date, or both.">
      <Card accent={colors.passingPurple}>
        <Badge label="Remembrance" tone="passing" />
        <Text className="mb-5 mt-4 font-heading text-[28px] font-medium leading-8 text-deep-charcoal">Passing details</Text>
        <FieldPreview label="Person" value="Marhoom Abbas Bhai" />
        <FieldPreview label="Date type" value="Gregorian / Hijri / Both" />
        <FieldPreview label={passingDateLabel} value="23 May 2020" />
        <FieldPreview label="Hijri Date of Passing" value="Optional" />
        <FieldPreview label="Reminder days" value="7, 5, 2, 1, same day" />
        <PrimaryButton label="Save Anniversary of their passing" tone="purple" onPress={() => navigation.navigate("UpcomingReminders")} />
      </Card>
    </Screen>
  );
}

export function UpcomingRemindersScreen() {
  return (
    <Screen eyebrow="Reminder timeline" title="Upcoming reminders" subtitle="Family dates sorted by what needs attention next.">
      <ReminderPreview name="Fatema Ben" title="Birthday" text="In 7 days. She will turn 31." />
      <ReminderPreview name="Husain Bhai" title="Hijri Birthday (Waras)" text="In 2 days - 8 Rajab ul Asab." tone="waras" />
      <ReminderPreview name="Marhoom Abbas Bhai" title="Anniversary of their passing" text="Tomorrow. Years since passing: 6." tone="passing" />
    </Screen>
  );
}

export function ReminderSettingsScreen() {
  return (
    <Screen eyebrow="Workspace defaults" title="Reminder settings" subtitle="Choose default reminder days and channels for this family workspace.">
      <Card>
        <View className="mb-5 h-12 w-12 items-center justify-center rounded-input bg-grey-light">
          <BellRing color={colors.goldDark} size={21} strokeWidth={1.8} />
        </View>
        <FieldPreview label="Reminder days" value="7 days, 5 days, 2 days, 1 day, same day" />
        <FieldPreview label="Channels" value="Push notifications, email reminders" />
        <FieldPreview label="Premium add-on later" value="WhatsApp reminders" />
        <PrimaryButton label="Save settings" />
      </Card>
    </Screen>
  );
}

export function RelationshipLinkingScreen() {
  return (
    <Screen eyebrow="Relationships" title="Relationship linking" subtitle="Link people now. A visual family tree can use core mappings later.">
      <Card>
        <View className="mb-5 h-12 w-12 items-center justify-center rounded-input bg-grey-light">
          <Link2 color={colors.goldDark} size={21} strokeWidth={1.8} />
        </View>
        <FieldPreview label="Person" value="Fatema Ben" />
        <FieldPreview label="Related person" value="Husain Bhai" />
        <FieldPreview label="Relationship" value="Sister" />
        <FieldPreview label="Use for family tree" value="Yes · sibling" />
        <PrimaryButton label="Save relationship" />
      </Card>
      <QuietButton label="+ Add Custom Relationship" />
    </Screen>
  );
}

export function AccessManagementScreen() {
  return (
    <Screen eyebrow="Workspace access" title="Access management" subtitle="Invite trusted family admins and prepare viewer access for later.">
      <Card>
        <View className="h-12 w-12 items-center justify-center rounded-input bg-grey-light">
          <Lock color={colors.goldDark} size={21} strokeWidth={1.8} />
        </View>
        <Text className="mt-5 font-heading text-[28px] font-medium leading-8 text-deep-charcoal">Family Admin</Text>
        <Text className="mt-2 font-body text-sm leading-6 text-grey-dark">Can add people, important dates, reminders, relationships, and access.</Text>
      </Card>
      <Card>
        <Badge label="Later role" />
        <Text className="mt-5 font-heading text-[28px] font-medium leading-8 text-deep-charcoal">Viewer</Text>
        <Text className="mt-2 font-body text-sm leading-6 text-grey-dark">Can view records and reminders when invited.</Text>
      </Card>
      <PrimaryButton label="Invite admin" />
    </Screen>
  );
}

export function SubscriptionPlansScreen() {
  const { plans } = useYaadiStore();

  return (
    <Screen eyebrow="Workspace plans" title="Subscription plans" subtitle="Subscriptions belong to the family workspace.">
      {plans.map((plan) => (
        <Card key={plan.id} accent={plan.name === "Family Plus" ? colors.mutedGold : colors.border}>
          <View className="flex-row items-center justify-between">
            <Badge label={plan.name === "Family Plus" ? "Recommended" : "Family plan"} />
            {plan.name === "Family Plus" ? <Crown color={colors.goldDark} size={22} strokeWidth={1.8} /> : null}
          </View>
          <Text className="mt-5 font-heading text-[30px] font-medium leading-8 text-deep-charcoal">{plan.name}</Text>
          <Text className="mt-3 font-body text-base text-deep-charcoal">₹{plan.priceMonthly}/month · ₹{plan.priceYearly}/year</Text>
          <Text className="mt-2 font-body text-sm leading-6 text-grey-dark">
            Up to {plan.maxPeople} people · {plan.maxAdmins} admin{plan.maxAdmins > 1 ? "s" : ""} · {plan.exportEnabled ? "Export data" : "Core reminders"}
          </Text>
          <View className="mt-4">
            <PrimaryButton label={plan.name === "Family Plus" ? "Current trial" : "Choose plan"} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

export function SettingsScreen({ navigation }: NavProps) {
  return (
    <Screen eyebrow="Workspace" title="Settings" subtitle="Workspace preferences, account settings, and platform tools.">
      <View className="gap-3">
        <QuietButton label="Reminder settings" onPress={() => navigation.navigate("ReminderSettings")} />
        <QuietButton label="Subscription plans" onPress={() => navigation.navigate("SubscriptionPlans")} />
        <QuietButton label="Access management" onPress={() => navigation.navigate("AccessManagement")} />
        <QuietButton label="Super admin dashboard" onPress={() => navigation.navigate("SuperAdminDashboard")} />
      </View>
    </Screen>
  );
}

export function SuperAdminDashboardScreen() {
  return (
    <Screen eyebrow="Platform" title="Super admin dashboard" subtitle="Platform owner controls for workspaces, users, plans, payments, and access.">
      <Card>
        <View className="flex-row flex-wrap">
          <StatPill label="Workspaces" value={18} />
          <StatPill label="Active" value={12} />
          <StatPill label="Trials" value={6} />
        </View>
      </Card>
      <Card>
        <Text className="font-heading text-[28px] font-medium leading-8 text-deep-charcoal">Workspace controls</Text>
        <Text className="mt-2 font-body text-sm leading-6 text-grey-dark">Activate or deactivate workspaces and review payment state.</Text>
      </Card>
    </Screen>
  );
}

function ReminderPreview(props: { name: string; title: string; text: string; tone?: "waras" | "passing" }) {
  return <ReminderCard name={props.name} title={props.title} detail={props.text} tone={props.tone ?? "birthday"} />;
}

function QuickAction(props: {
  icon: typeof UserRoundPlus;
  label: string;
  onPress: () => void;
}) {
  const Icon = props.icon;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      className="mb-3 min-h-[124px] w-[48%] justify-between rounded-card border border-line bg-cream p-4"
      style={({ pressed }) => ({
        shadowColor: colors.deepCharcoal,
        shadowOpacity: pressed ? 0.06 : 0.08,
        shadowRadius: pressed ? 10 : 16,
        shadowOffset: { width: 0, height: pressed ? 2 : 4 },
        elevation: pressed ? 1 : 2
      })}
    >
      <View className="h-11 w-11 items-center justify-center rounded-input bg-grey-light">
        <Icon color={colors.goldDark} size={20} strokeWidth={1.8} />
      </View>
      <Text className="font-body text-base font-medium leading-5 text-deep-charcoal">{props.label}</Text>
    </Pressable>
  );
}

function describeImportantDate(date: ReturnType<typeof useYaadiStore.getState>["importantDates"][number]): string {
  if (date.type === "birthday" && date.gregorianDate) {
    const age = calculateGregorianAge(date.gregorianDate, makeLocalDate(2026, 5, 22));
    return `${date.gregorianDate.toLocaleDateString()} · current age ${age}`;
  }

  if (date.type === "hijri_birthday_waras" && date.hijriDay && date.hijriMonth) {
    const next = getNextHijriBirthdayWarasOccurrence({
      hijriDay: date.hijriDay,
      hijriMonth: date.hijriMonth,
      today: makeLocalDate(2026, 5, 22)
    });
    const currentHijri = gregorianToHijri(makeLocalDate(2026, 5, 22));
    const hijriAge = calculateHijriAge({ hijriBirthYear: date.hijriYear, currentHijriYear: currentHijri.year });
    return `${formatHijriDayMonth(date.hijriMonth, date.hijriDay)} · next ${next.toLocaleDateString()}${hijriAge ? ` · Hijri age ${hijriAge}` : ""}`;
  }

  if (date.gregorianDate) {
    return `${date.gregorianDate.toLocaleDateString()} · years since passing ${calculateYearsSincePassing(date.gregorianDate, makeLocalDate(2026, 5, 22))}`;
  }

  return "Important date";
}

export const tabIcons = {
  Home,
  People: Users,
  Reminders: CalendarDays,
  Relations: Heart,
  Settings
};
