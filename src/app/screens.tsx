import { Dispatch, ReactNode, SetStateAction, useEffect, useState } from "react";
import { Platform, Pressable, Share, Text, View } from "react-native";
import {
  BellRing,
  CalendarDays,
  CalendarHeart,
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
import {
  Badge,
  Card,
  ChoiceButton,
  FormField,
  InlineNotice,
  PrimaryButton,
  QuietButton,
  ReminderCard,
  Screen,
  SectionTitle,
  StatPill
} from "../components/ui";
import { useYaadiStore } from "./store";
import {
  calculateGregorianAge,
  calculateHijriAge,
  calculateYearsMarried,
  calculateYearsSincePassing,
  daysUntil,
  formatHijriDayMonth,
  getNextHijriBirthdayWarasOccurrence,
  gregorianToHijri,
  makeLocalDate
} from "../lib/calendar/dateConversion";
import { evaluateSubscriptionGate } from "../lib/subscriptions/enforcement";
import { buildReminderMessage, getOccurrenceDate, getPersonDisplayName } from "../lib/reminders/reminderEngine";
import { getHijriMonthName } from "../lib/calendar/hijriMonths";
import { supabase } from "../lib/supabase/client";
import { ImportantDate, Person, PersonRelationship, PublicSubmissionPayload, RelationshipType } from "../types/domain";

type NavProps = any;

const reminderDays = [7, 5, 2, 1, 0];

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
  const { bootstrap, initialized, session, workspaces, signIn, signUp, resetPassword, error, loading } = useYaadiStore();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!initialized) {
      void bootstrap();
    }
  }, [bootstrap, initialized]);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (workspaces.length === 0) {
      navigation.replace?.("CreateWorkspace");
      return;
    }

    if (workspaces.length === 1) {
      void useYaadiStore.getState().selectWorkspace(workspaces[0].id).then(() => navigation.replace?.("Main"));
      return;
    }

    navigation.replace?.("WorkspacePicker");
  }, [navigation, session, workspaces]);

  async function submit() {
    setNotice("");
    try {
      if (mode === "signup") {
        await signUp(email, password, firstName, lastName);
        if (!useYaadiStore.getState().session) {
          setNotice("Account created. Confirm your email if Supabase email confirmation is enabled, then log in.");
        }
      } else {
        await signIn(email, password);
      }
    } catch {
      // Store error is rendered below.
    }
  }

  return (
    <Screen eyebrow="Private workspace" title="Welcome to Yaadi" subtitle={APP_TAGLINE}>
      <Card>
        <Badge label={mode === "login" ? "Family access" : "Create account"} />
        <Text className="mb-5 mt-4 font-heading text-[28px] font-medium leading-8 text-deep-charcoal">
          {mode === "login" ? "Sign in to your family space" : "Start a private family space"}
        </Text>
        {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
        {notice ? <InlineNotice>{notice}</InlineNotice> : null}
        {mode === "signup" ? (
          <View className="flex-row gap-3">
            <View className="flex-1"><FormField label="First name" value={firstName} onChangeText={setFirstName} /></View>
            <View className="flex-1"><FormField label="Last name" value={lastName} onChangeText={setLastName} /></View>
          </View>
        ) : null}
        <FormField label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <FormField label="Password" secureTextEntry value={password} onChangeText={setPassword} helper="Use at least 6 characters." />
        <PrimaryButton label={loading ? "Working..." : mode === "login" ? "Login" : "Create account"} onPress={() => void submit()} />
        <View className="mt-3 gap-2">
          <QuietButton label={mode === "login" ? "Create an account" : "Back to login"} onPress={() => setMode(mode === "login" ? "signup" : "login")} />
          {mode === "login" ? (
            <QuietButton
              label="Email password reset"
              onPress={() => void resetPassword(email).then(() => setNotice("Password reset email requested."))}
            />
          ) : null}
        </View>
      </Card>
    </Screen>
  );
}

export function CreateWorkspaceScreen({ navigation }: NavProps) {
  const { createWorkspace, error, loading } = useYaadiStore();
  const [name, setName] = useState("");

  async function submit() {
    try {
      await createWorkspace(name);
      navigation.replace?.("Main");
    } catch {
      // Store error is rendered.
    }
  }

  return (
    <Screen eyebrow="Step 1" title="Create family workspace" subtitle="Start with your family, then add people and their important dates.">
      <Card>
        <Badge label="14 day trial" />
        <Text className="mb-5 mt-4 font-heading text-[28px] font-medium leading-8 text-deep-charcoal">A calm home for family dates</Text>
        {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
        <FormField label="Workspace name" placeholder="Murtaza Family" value={name} onChangeText={setName} />
        <InlineNotice>Trial access begins with up to 10 people and reminder channels enabled.</InlineNotice>
        <PrimaryButton label={loading ? "Creating..." : "Create workspace"} onPress={() => void submit()} />
      </Card>
    </Screen>
  );
}

export function WorkspacePickerScreen({ navigation }: NavProps) {
  const { workspaces, selectWorkspace } = useYaadiStore();
  return (
    <Screen eyebrow="Your families" title="Choose workspace" subtitle="Open the family space you want to manage now.">
      {workspaces.map((workspace) => (
        <Card key={workspace.id}>
          <Badge label={workspace.subscriptionStatus} />
          <Text className="mb-4 mt-4 font-heading text-[30px] font-medium text-deep-charcoal">{workspace.name}</Text>
          <PrimaryButton
            label="Open workspace"
            onPress={() => void selectWorkspace(workspace.id).then(() => navigation.replace?.("Main"))}
          />
        </Card>
      ))}
      <QuietButton label="Create another workspace" onPress={() => navigation.navigate("CreateWorkspace")} />
    </Screen>
  );
}

export function DashboardScreen({ navigation }: NavProps) {
  const { workspace, people, importantDates, plans } = useYaadiStore();
  if (!workspace) {
    return <WorkspaceMissing navigation={navigation} />;
  }

  const plan = plans.find((item) => item.id === workspace.planId);
  const gate = evaluateSubscriptionGate({ workspace, plan, peopleCount: people.length, adminsCount: 1 });
  const upcoming = getUpcomingCards(importantDates, people).slice(0, 5);

  return (
    <Screen eyebrow={`${workspace.name} · ${plan?.name ?? "Family Plus"} ${workspace.subscriptionStatus}`} title={APP_NAME} subtitle="A private reminder desk for every person and every special date.">
      <Card accent={colors.goldLight}>
        <View className="flex-row items-start justify-between">
          <View className="h-14 w-14 items-center justify-center rounded-input bg-grey-light">
            <Home color={colors.goldDark} size={24} strokeWidth={1.8} />
          </View>
          <Badge label={workspace.subscriptionStatus === "trial" ? "Trial active" : workspace.subscriptionStatus} />
        </View>
        <Text className="mt-6 font-heading text-[32px] font-semibold leading-9 text-deep-charcoal">Your Yaadi calendar is active</Text>
        <Text className="mt-2 font-body text-base leading-6 text-charcoal-light">People first. Dates and reminders follow them.</Text>
        <View className="mt-4 flex-row flex-wrap">
          <StatPill label="People" value={people.length} />
          <StatPill label="Dates" value={importantDates.length} />
          <StatPill label="Upcoming" value={upcoming.length} />
        </View>
        {gate.showUpgradeCta ? <Text className="mt-4 font-body text-sm text-gold-dark">{gate.reason}</Text> : null}
      </Card>

      <SectionTitle>Coming up</SectionTitle>
      {upcoming.length === 0 ? <InlineNotice>Add a person and a date to start the reminder timeline.</InlineNotice> : null}
      {upcoming.map((item) => <ReminderPreview key={item.id} {...item} />)}

      <SectionTitle>Quick actions</SectionTitle>
      <View className="flex-row flex-wrap justify-between">
        <QuickAction icon={UserRoundPlus} label="Add Person" onPress={() => navigation.navigate("AddPerson")} />
        <QuickAction icon={Users} label="View People" onPress={() => navigation.navigate("PeopleDirectory")} />
        <QuickAction icon={CalendarPlus} label="Add Date" onPress={() => navigation.navigate("AddBirthday")} />
        <QuickAction icon={CalendarHeart} label="Wedding" onPress={() => navigation.navigate("AddWeddingAnniversary")} />
        <QuickAction icon={ShieldCheck} label="Access" onPress={() => navigation.navigate("AccessManagement")} />
        <QuickAction icon={Link2} label="Relations" onPress={() => navigation.navigate("RelationshipLinking")} />
      </View>
    </Screen>
  );
}

export function PeopleDirectoryScreen({ navigation }: NavProps) {
  const { people, setSelectedPersonId } = useYaadiStore();
  return (
    <Screen eyebrow="People first" title="People directory" subtitle="Manage people first, then attach their dates and reminders.">
      {people.length === 0 ? <InlineNotice>No people yet. Add the first family member to begin.</InlineNotice> : null}
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
      <PrimaryButton label="Add Person" onPress={() => navigation.navigate("AddPerson")} />
    </Screen>
  );
}

export function PersonProfileScreen({ navigation }: NavProps) {
  const { people, importantDates, selectedPersonId, deletePerson, deleteImportantDate } = useYaadiStore();
  const person = people.find((item) => item.id === selectedPersonId);
  if (!person) {
    return <Screen title="Person profile"><InlineNotice>Select a person from the directory first.</InlineNotice></Screen>;
  }
  const dates = importantDates.filter((item) => item.participantPersonIds?.includes(person.id) || item.personId === person.id);

  return (
    <Screen eyebrow="Person profile" title={getPersonDisplayName(person)} subtitle="Profile, dates, reminders, and relationships.">
      <Card accent={colors.goldLight}>
        <View className="flex-row items-center justify-between">
          <Badge label={person.livingStatus === "living" ? "Living" : "Deceased"} tone={person.livingStatus === "living" ? "gold" : "passing"} />
          <Text className="font-body text-sm text-grey-dark">{person.familyGroup ?? "Family"}</Text>
        </View>
        <Text className="mt-6 font-body text-base leading-6 text-charcoal-light">Add important dates directly to this person so the reminder timeline stays personal.</Text>
        <View className="mt-4 gap-2">
          <QuietButton label="Edit person" onPress={() => navigation.navigate("AddPerson", { personId: person.id })} />
          <QuietButton label="Remove person" onPress={() => void deletePerson(person.id).then(() => navigation.navigate("PeopleDirectory"))} />
        </View>
      </Card>
      <SectionTitle>Important dates</SectionTitle>
      {dates.length === 0 ? <InlineNotice>No important dates saved for this person yet.</InlineNotice> : null}
      {dates.map((date) => (
        <Card key={date.id}>
          <ReminderCard
            name={importantDateLabels[date.type]}
            title={date.type === "passing_anniversary" ? "Remembrance" : "Important date"}
            detail={describeImportantDate(date, people)}
            tone={date.type === "hijri_birthday_waras" ? "waras" : date.type === "passing_anniversary" ? "passing" : "birthday"}
          />
          <View className="gap-2">
            <QuietButton label="Edit date" onPress={() => navigateDateEditor(navigation, date)} />
            <QuietButton label="Delete date" onPress={() => void deleteImportantDate(date.id)} />
          </View>
        </Card>
      ))}
      <View className="gap-3">
        <PrimaryButton label="Add Birthday" onPress={() => navigation.navigate("AddBirthday")} />
        <PrimaryButton label="Add Hijri Birthday (Waras)" tone="green" onPress={() => navigation.navigate("AddHijriBirthdayWaras")} />
        <PrimaryButton label="Add Wedding Anniversary" onPress={() => navigation.navigate("AddWeddingAnniversary")} />
        <PrimaryButton label="Add Anniversary of their passing" tone="purple" onPress={() => navigation.navigate("AddPassingAnniversary")} />
      </View>
    </Screen>
  );
}

export function AddPersonScreen({ navigation, route }: NavProps) {
  const { people, createPerson, updatePerson, error } = useYaadiStore();
  const person = people.find((item) => item.id === route?.params?.personId);
  const [firstName, setFirstName] = useState(person?.firstName ?? "");
  const [middleName, setMiddleName] = useState(person?.middleName ?? "");
  const [lastName, setLastName] = useState(person?.lastName ?? "");
  const [displayName, setDisplayName] = useState(person?.displayName ?? "");
  const [gender, setGender] = useState(person?.gender ?? "");
  const [livingStatus, setLivingStatus] = useState<Person["livingStatus"]>(person?.livingStatus ?? "living");
  const [mobile, setMobile] = useState(person?.mobile ?? "");
  const [email, setEmail] = useState(person?.email ?? "");
  const [familyGroup, setFamilyGroup] = useState(person?.familyGroup ?? "");
  const [notes, setNotes] = useState(person?.notes ?? "");

  async function save() {
    clearFormError();
    if (!firstName.trim()) {
      setFormError("First name is required before saving a person.");
      return;
    }

    const payload = { firstName, middleName, lastName, displayName, gender, livingStatus, mobile, email, familyGroup, notes };
    try {
      if (person) {
        await updatePerson(person.id, payload);
      } else {
        await createPerson(payload);
      }
      navigation.navigate(person ? "PersonProfile" : "PeopleDirectory");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Person could not be saved.");
    }
  }

  return (
    <Screen eyebrow={person ? "Edit Person" : "Add Person"} title={person ? "Update person" : "Start with a person"} subtitle="Create the family member first. Dates come next.">
      <Card>
        {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
        <FormField label="First name" value={firstName} onChangeText={setFirstName} />
        <FormField label="Middle name" value={middleName} onChangeText={setMiddleName} />
        <FormField label="Last name" value={lastName} onChangeText={setLastName} />
        <FormField label="Display name" value={displayName} onChangeText={setDisplayName} />
        <Text className="mb-2 font-body text-sm font-medium text-charcoal-light">Living status</Text>
        <View className="mb-3 flex-row flex-wrap">
          <ChoiceButton label="Living" selected={livingStatus === "living"} onPress={() => setLivingStatus("living")} />
          <ChoiceButton label="Deceased" selected={livingStatus === "deceased"} onPress={() => setLivingStatus("deceased")} />
        </View>
        <FormField label="Gender" value={gender} onChangeText={setGender} helper="Optional. Use male or female if Birthday pronouns should be personal." />
        <FormField label="Mobile" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
        <FormField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <FormField label="Family group" value={familyGroup} onChangeText={setFamilyGroup} />
        <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />
        <PrimaryButton label={person ? "Save changes" : "Save person"} onPress={() => void save()} />
      </Card>
    </Screen>
  );
}

export function AddBirthdayScreen({ navigation, route }: NavProps) {
  const { selectedPersonId, importantDates, createImportantDate, updateImportantDate, error } = useYaadiStore();
  const savedDate = importantDates.find((item) => item.id === route?.params?.dateId && item.type === "birthday");
  const [personId, setPersonId] = useState(savedDate?.personId ?? selectedPersonId ?? "");
  const [date, setDate] = useState(savedDate?.gregorianDate ? toInputDate(savedDate.gregorianDate) : "");
  const [notes, setNotes] = useState(savedDate?.notes ?? "");

  async function save() {
    clearFormError();
    try {
      if (!personId) {
        throw new Error("Choose a person before saving this Birthday.");
      }
      if (!date.trim()) {
        throw new Error("Enter the Gregorian date of birth in YYYY-MM-DD format.");
      }
      const payload = {
        personId,
        type: "birthday",
        gregorianDate: readDate(date),
        showYear: true,
        reminderDaysBefore: reminderDays,
        notes
      } as const;
      if (savedDate) {
        await updateImportantDate(savedDate.id, payload);
      } else {
        await createImportantDate(payload);
      }
      navigation.navigate("UpcomingReminders");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Birthday could not be saved.");
    }
  }

  return (
    <DateFormShell error={error} title={savedDate ? "Edit Birthday" : "Add Birthday"} subtitle="Set the Gregorian birthday and reminder days.">
      <PersonPicker label="Person" selectedPersonId={personId} onSelect={setPersonId} />
      <FormField label="Gregorian date of birth" placeholder="1995-05-29" value={date} onChangeText={setDate} helper="Use YYYY-MM-DD. Birthday reminders show the turning age when year exists." />
      <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />
      <ReminderOffsets />
      <PrimaryButton label={savedDate ? "Save Birthday changes" : "Save Birthday"} onPress={() => void save()} />
    </DateFormShell>
  );
}

export function AddHijriBirthdayWarasScreen({ navigation, route }: NavProps) {
  const { selectedPersonId, importantDates, createImportantDate, updateImportantDate, error } = useYaadiStore();
  const savedDate = importantDates.find((item) => item.id === route?.params?.dateId && item.type === "hijri_birthday_waras");
  const [personId, setPersonId] = useState(savedDate?.personId ?? selectedPersonId ?? "");
  const [day, setDay] = useState(savedDate?.hijriDay ? String(savedDate.hijriDay) : "");
  const [month, setMonth] = useState(savedDate?.hijriMonth ? String(savedDate.hijriMonth) : "");
  const [year, setYear] = useState(savedDate?.hijriYear ? String(savedDate.hijriYear) : "");
  const [notes, setNotes] = useState(savedDate?.notes ?? "");

  async function save() {
    clearFormError();
    try {
      if (!personId) {
        throw new Error("Choose a person before saving this Hijri Birthday.");
      }
      const payload = {
        personId,
        type: "hijri_birthday_waras",
        hijriDay: readInt(day),
        hijriMonth: readInt(month),
        hijriYear: optionalInt(year),
        dateSource: "confirmed",
        reminderDaysBefore: reminderDays,
        notes
      } as const;
      if (savedDate) {
        await updateImportantDate(savedDate.id, payload);
      } else {
        await createImportantDate(payload);
      }
      navigation.navigate("UpcomingReminders");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Hijri Birthday (Waras) could not be saved.");
    }
  }

  return (
    <DateFormShell error={error} title={savedDate ? "Edit Hijri Birthday (Waras)" : "Add Hijri Birthday (Waras)"} subtitle="Set the Hijri date using the Mumineen Calendar conversion." accent={colors.hijriGreen}>
      <PersonPicker label="Person" selectedPersonId={personId} onSelect={setPersonId} />
      <FormField label="Hijri day" value={day} onChangeText={setDay} keyboardType="number-pad" placeholder="8" />
      <FormField label="Hijri month" value={month} onChangeText={setMonth} keyboardType="number-pad" placeholder="7" helper="Store months as 1 to 12. For example, 7 is Rajab al-Asab." />
      <HijriMonthGuide />
      <FormField label="Hijri year" value={year} onChangeText={setYear} keyboardType="number-pad" placeholder="Optional" />
      <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />
      <ReminderOffsets />
      <PrimaryButton label={savedDate ? "Save changes" : "Save Hijri Birthday (Waras)"} tone="green" onPress={() => void save()} />
    </DateFormShell>
  );
}

export function AddPassingAnniversaryScreen({ navigation, route }: NavProps) {
  const { selectedPersonId, importantDates, createImportantDate, updateImportantDate, error } = useYaadiStore();
  const savedDate = importantDates.find((item) => item.id === route?.params?.dateId && item.type === "passing_anniversary");
  const [personId, setPersonId] = useState(savedDate?.personId ?? selectedPersonId ?? "");
  const [gregorianDate, setGregorianDate] = useState(savedDate?.gregorianDate ? toInputDate(savedDate.gregorianDate) : "");
  const [hijriDay, setHijriDay] = useState(savedDate?.hijriDay ? String(savedDate.hijriDay) : "");
  const [hijriMonth, setHijriMonth] = useState(savedDate?.hijriMonth ? String(savedDate.hijriMonth) : "");
  const [notes, setNotes] = useState(savedDate?.notes ?? "");

  async function save() {
    clearFormError();
    try {
      if (!personId) {
        throw new Error("Choose a person before saving this anniversary.");
      }
      if (!gregorianDate.trim() && (!hijriDay.trim() || !hijriMonth.trim())) {
        throw new Error("Add a Gregorian Date of Passing, or both Hijri day and Hijri month.");
      }
      const payload = {
        personId,
        type: "passing_anniversary",
        gregorianDate: gregorianDate ? readDate(gregorianDate) : undefined,
        hijriDay: optionalInt(hijriDay),
        hijriMonth: optionalInt(hijriMonth),
        reminderDaysBefore: reminderDays,
        notes
      } as const;
      if (savedDate) {
        await updateImportantDate(savedDate.id, payload);
      } else {
        await createImportantDate(payload);
      }
      navigation.navigate("UpcomingReminders");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Anniversary of their passing could not be saved.");
    }
  }

  return (
    <DateFormShell error={error} title={savedDate ? "Edit Anniversary of their passing" : "Add Anniversary of their passing"} subtitle="Set Date of Passing by Gregorian date, Hijri date, or both." accent={colors.passingPurple}>
      <PersonPicker label="Person" selectedPersonId={personId} onSelect={setPersonId} />
      <FormField label={passingDateLabel} value={gregorianDate} onChangeText={setGregorianDate} placeholder="2020-05-23" helper="Optional when a Hijri Date of Passing is provided." />
      <FormField label="Hijri Date of Passing day" value={hijriDay} onChangeText={setHijriDay} keyboardType="number-pad" />
      <FormField label="Hijri Date of Passing month" value={hijriMonth} onChangeText={setHijriMonth} keyboardType="number-pad" />
      <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />
      <ReminderOffsets />
      <PrimaryButton label={savedDate ? "Save changes" : "Save Anniversary of their passing"} tone="purple" onPress={() => void save()} />
    </DateFormShell>
  );
}

export function AddWeddingAnniversaryScreen({ navigation, route }: NavProps) {
  const { people, selectedPersonId, importantDates, createImportantDate, updateImportantDate, error } = useYaadiStore();
  const savedDate = importantDates.find((item) => item.id === route?.params?.dateId && item.type === "wedding_anniversary");
  const [firstPersonId, setFirstPersonId] = useState(savedDate?.personId ?? selectedPersonId ?? people[0]?.id ?? "");
  const [secondPersonId, setSecondPersonId] = useState(savedDate?.participantPersonIds?.find((personId) => personId !== savedDate.personId) ?? "");
  const [date, setDate] = useState(savedDate?.gregorianDate ? toInputDate(savedDate.gregorianDate) : "");
  const [notes, setNotes] = useState(savedDate?.notes ?? "");

  async function save() {
    clearFormError();
    try {
      if (!firstPersonId || !secondPersonId || firstPersonId === secondPersonId) {
        throw new Error("Choose two people for Wedding Anniversary.");
      }
      if (!date.trim()) {
        throw new Error("Enter the Wedding date in YYYY-MM-DD format.");
      }
      const payload = {
        personId: firstPersonId,
        participantPersonIds: [firstPersonId, secondPersonId],
        type: "wedding_anniversary" as const,
        gregorianDate: readDate(date),
        showYear: true,
        reminderDaysBefore: reminderDays,
        notes
      };
      if (savedDate) {
        await updateImportantDate(savedDate.id, payload);
      } else {
        await createImportantDate(payload);
      }
      navigation.navigate("UpcomingReminders");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Wedding Anniversary could not be saved.");
    }
  }

  return (
    <DateFormShell error={error} title={savedDate ? "Edit Wedding Anniversary" : "Add Wedding Anniversary"} subtitle="Link the anniversary to both people in the couple.">
      <PersonPicker label="First person" selectedPersonId={firstPersonId} onSelect={setFirstPersonId} />
      <PersonPicker label="Second person" selectedPersonId={secondPersonId} onSelect={setSecondPersonId} />
      <FormField label="Wedding date" placeholder="2014-06-02" value={date} onChangeText={setDate} />
      <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />
      <ReminderOffsets />
      <PrimaryButton label={savedDate ? "Save changes" : "Save Wedding Anniversary"} onPress={() => void save()} />
    </DateFormShell>
  );
}

export function UpcomingRemindersScreen() {
  const { importantDates, people } = useYaadiStore();
  const upcoming = getUpcomingCards(importantDates, people);
  return (
    <Screen eyebrow="Reminder timeline" title="Upcoming reminders" subtitle="Family dates sorted by what needs attention next.">
      {upcoming.length === 0 ? <InlineNotice>No saved reminders yet.</InlineNotice> : null}
      {upcoming.map((item) => <ReminderPreview key={item.id} {...item} />)}
    </Screen>
  );
}

export function ReminderSettingsScreen() {
  const { workspace, saveReminderSettings, registerPushNotifications, sendTestReminder, error } = useYaadiStore();
  const [timezone, setTimezone] = useState(workspace?.timezone ?? "Asia/Kolkata");
  const [sendTime, setSendTime] = useState(workspace?.reminderSendTime ?? "09:00");
  const [notice, setNotice] = useState("");

  return (
    <Screen eyebrow="Workspace defaults" title="Reminder settings" subtitle="Choose reminder timing and channels for this family workspace.">
      <Card>
        <View className="mb-5 h-12 w-12 items-center justify-center rounded-input bg-grey-light">
          <BellRing color={colors.goldDark} size={21} strokeWidth={1.8} />
        </View>
        {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
        {notice ? <InlineNotice>{notice}</InlineNotice> : null}
        <FormField label="Timezone" value={timezone} onChangeText={setTimezone} />
        <FormField label="Daily send time" value={sendTime} onChangeText={setSendTime} placeholder="09:00" />
        <ReminderOffsets />
        <InlineNotice>Email and Expo push are enabled for owner/admin reminder delivery. WhatsApp remains a later premium channel.</InlineNotice>
        <PrimaryButton
          label="Save settings"
          onPress={() => void saveReminderSettings({ timezone, reminderSendTime: sendTime, channels: ["app", "email"], days: reminderDays })}
        />
        <View className="mt-3 gap-2">
          <QuietButton label="Register this device for push" onPress={() => void registerPushNotifications().then(() => setNotice("Expo push token registered for this workspace."))} />
          <QuietButton label="Send test reminder" onPress={() => void sendTestReminder().then(() => setNotice("Test reminder requested."))} />
        </View>
      </Card>
    </Screen>
  );
}

export function RelationshipLinkingScreen() {
  const {
    people,
    relationshipTypes,
    personRelationships,
    loadRelationships,
    createRelationship,
    deleteRelationship,
    error
  } = useYaadiStore();
  const [personId, setPersonId] = useState(people[0]?.id ?? "");
  const [relatedPersonId, setRelatedPersonId] = useState(people.find((person) => person.id !== personId)?.id ?? "");
  const [relationshipTypeId, setRelationshipTypeId] = useState(relationshipTypes[0]?.id ?? "");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    void loadRelationships();
  }, [loadRelationships]);

  useEffect(() => {
    if (!personId && people[0]) {
      setPersonId(people[0].id);
    }
    if (!relatedPersonId || relatedPersonId === personId) {
      setRelatedPersonId(people.find((person) => person.id !== personId)?.id ?? "");
    }
  }, [people, personId, relatedPersonId]);

  useEffect(() => {
    if (!relationshipTypeId && relationshipTypes[0]) {
      setRelationshipTypeId(relationshipTypes[0].id);
    }
  }, [relationshipTypeId, relationshipTypes]);

  const saveRelationship = async () => {
    if (!personId || !relatedPersonId || !relationshipTypeId) {
      return;
    }
    await createRelationship({ personId, relatedPersonId, relationshipTypeId, notes });
    setNotes("");
  };

  return (
    <Screen eyebrow="Relationships" title="Relationship linking" subtitle="Link people now. A visual family tree can use core mappings later.">
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
      <Card>
        <View className="mb-5 h-12 w-12 items-center justify-center rounded-input bg-grey-light">
          <Link2 color={colors.goldDark} size={21} strokeWidth={1.8} />
        </View>
        {people.length < 2 ? (
          <InlineNotice>Add at least two people before linking relationships.</InlineNotice>
        ) : (
          <>
            <SectionTitle>Person</SectionTitle>
            <ChoiceGrid>
              {people.map((person) => (
                <ChoiceButton key={person.id} label={personName(person)} selected={person.id === personId} onPress={() => setPersonId(person.id)} />
              ))}
            </ChoiceGrid>
            <SectionTitle>Related person</SectionTitle>
            <ChoiceGrid>
              {people.filter((person) => person.id !== personId).map((person) => (
                <ChoiceButton key={person.id} label={personName(person)} selected={person.id === relatedPersonId} onPress={() => setRelatedPersonId(person.id)} />
              ))}
            </ChoiceGrid>
            <SectionTitle>Relationship</SectionTitle>
            {relationshipTypesByCategory(relationshipTypes).map(([category, types]) => (
              <View key={category} className="mb-2">
                <Text className="mb-2 font-body text-xs uppercase text-grey-dark">{category}</Text>
                <ChoiceGrid>
                  {types.map((type) => (
                    <ChoiceButton
                      key={type.id}
                      label={type.name}
                      selected={type.id === relationshipTypeId}
                      onPress={() => setRelationshipTypeId(type.id)}
                    />
                  ))}
                </ChoiceGrid>
              </View>
            ))}
            <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />
            <PrimaryButton label="Save relationship" onPress={() => void saveRelationship()} />
          </>
        )}
      </Card>
      <Card>
        <Text className="font-heading text-[28px] font-medium text-deep-charcoal">Linked relationships</Text>
        {personRelationships.length === 0 ? <Text className="mt-3 font-body text-sm leading-6 text-grey-dark">No relationships linked yet.</Text> : null}
        {personRelationships.map((relationship) => (
          <RelationshipRow
            key={relationship.id}
            relationship={relationship}
            people={people}
            relationshipTypes={relationshipTypes}
            onDelete={() => void deleteRelationship(relationship.id)}
          />
        ))}
      </Card>
    </Screen>
  );
}

export function AccessManagementScreen({ navigation }: NavProps) {
  const { workspace, shareLink, invitations, submissions, members, loadAccessData, setShareLinkEnabled, replaceShareLink, createAdminInvitation, removeAdminMember, error } = useYaadiStore();
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (workspace) {
      void loadAccessData();
    }
  }, [loadAccessData, workspace]);
  const familyLink = shareLink ? getFamilyLink(shareLink.token) : "";

  return (
    <Screen eyebrow="Workspace access" title="Access management" subtitle="Invite trusted admins and share the permanent family collection form.">
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
      <Card>
        <View className="h-12 w-12 items-center justify-center rounded-input bg-grey-light">
          <Lock color={colors.goldDark} size={21} strokeWidth={1.8} />
        </View>
        <Text className="mt-5 font-heading text-[28px] font-medium leading-8 text-deep-charcoal">Permanent family form link</Text>
        <Text className="mt-2 font-body text-sm leading-6 text-grey-dark">Share this link once. Future fields can change behind the same workspace form.</Text>
        {shareLink ? (
          <>
            <InlineNotice>{familyLink}</InlineNotice>
            <View className="gap-2">
              {notice ? <InlineNotice>{notice}</InlineNotice> : null}
              <PrimaryButton label="Share form link" onPress={() => void shareFamilyLink(familyLink, setNotice)} />
              <QuietButton label={shareLink.enabled ? "Disable form link" : "Enable form link"} onPress={() => void setShareLinkEnabled(!shareLink.enabled)} />
              <QuietButton label="Replace link" onPress={() => void replaceShareLink()} />
            </View>
          </>
        ) : <InlineNotice>Loading the workspace form link.</InlineNotice>}
      </Card>
      <Card>
        <Badge label="Family Admin" />
        <Text className="mt-4 font-body text-sm leading-6 text-grey-dark">Owners and admins can add, remove, and edit people and dates.</Text>
        <FormField label="Invite admin email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <PrimaryButton label="Create admin invite" onPress={() => void createAdminInvitation(email).then(() => setEmail(""))} />
        {members.map((member) => (
          <View key={member.id} className="mt-3 rounded-input border border-line bg-grey-light p-3">
            <Text className="font-body text-sm text-deep-charcoal">{member.name ?? member.email ?? member.userId}</Text>
            <Text className="mt-1 font-body text-xs uppercase text-grey-dark">{member.role}</Text>
            {member.role === "admin" ? <View className="mt-2"><QuietButton label="Remove admin" onPress={() => void removeAdminMember(member.id)} /></View> : null}
          </View>
        ))}
        {invitations.map((invite) => (
          <View key={invite.id} className="mt-3 rounded-input border border-line bg-grey-light p-3">
            <Text className="font-body text-sm text-deep-charcoal">{invite.email} · {invite.status}</Text>
            <Text className="mt-1 font-body text-xs text-grey-dark">{getInviteLink(invite.token)}</Text>
          </View>
        ))}
      </Card>
      <Card>
        <Text className="font-heading text-[28px] font-medium text-deep-charcoal">Submission inbox</Text>
        <Text className="mb-4 mt-2 font-body text-sm leading-6 text-grey-dark">{submissions.filter((item) => item.status === "pending").length} submissions waiting for review.</Text>
        <PrimaryButton label="Review submissions" onPress={() => navigation.navigate("SubmissionInbox")} />
      </Card>
    </Screen>
  );
}

export function SubmissionInboxScreen() {
  const { submissions, people, approveSubmission, rejectSubmission } = useYaadiStore();
  return (
    <Screen eyebrow="Family form" title="Review submissions" subtitle="Public family details stay here until an owner or admin approves them.">
      {submissions.length === 0 ? <InlineNotice>No form submissions yet.</InlineNotice> : null}
      {submissions.map((submission) => (
        <Card key={submission.id}>
          <View className="flex-row items-center justify-between">
            <Badge label={submission.status} />
            <Text className="font-body text-xs text-grey-dark">{submission.createdAt.toLocaleDateString()}</Text>
          </View>
          <Text className="mt-4 font-heading text-[28px] font-medium text-deep-charcoal">{submission.submitterName}</Text>
          <Text className="mt-1 font-body text-sm text-grey-dark">{submission.submitterEmail ?? submission.submitterMobile ?? "No contact supplied"}</Text>
          {submission.payload.people.map((person) => {
            const matches = findPotentialMatches(person.firstName, person.lastName, people);
            return (
              <View key={person.clientId} className="mt-3 rounded-input border border-line bg-grey-light p-3">
                <Text className="font-body text-base text-deep-charcoal">{[person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ")}</Text>
                <Text className="mt-1 font-body text-xs text-grey-dark">
                  {[person.birthday ? "Birthday" : "", person.hijriBirthdayDay ? "Hijri Birthday (Waras)" : "", person.passingDate ? "Anniversary of their passing" : ""].filter(Boolean).join(" · ") || "Person details"}
                </Text>
                {matches.length > 0 ? <Text className="mt-1 font-body text-xs text-gold-dark">Possible existing match: {matches.map(getPersonDisplayName).join(", ")}</Text> : null}
              </View>
            );
          })}
          {submission.payload.weddings.length > 0 ? <Text className="mt-3 font-body text-sm text-charcoal-light">{submission.payload.weddings.length} Wedding Anniversary entry</Text> : null}
          {submission.status === "pending" ? (
            <View className="mt-4 gap-2">
              <PrimaryButton label="Approve as new records" onPress={() => void approveSubmission(submission.id)} />
              <QuietButton label="Reject submission" onPress={() => void rejectSubmission(submission.id)} />
            </View>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

export function PublicFamilyFormScreen({ route }: NavProps) {
  const token = route?.params?.token ?? "";
  const [workspaceName, setWorkspaceName] = useState("");
  const [available, setAvailable] = useState(false);
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [submitterMobile, setSubmitterMobile] = useState("");
  const [people, setPeople] = useState<PublicPersonDraft[]>([newPublicPerson()]);
  const [weddings, setWeddings] = useState<PublicWeddingDraft[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void supabase.rpc("get_public_family_form", { link_token: token }).then(({ data, error: formError }) => {
      const form = data?.[0];
      if (formError || !form?.enabled) {
        setError(formError?.message ?? "This family form link is unavailable.");
        return;
      }
      setWorkspaceName(form.workspace_name);
      setAvailable(true);
    });
  }, [token]);

  async function submit() {
    setError("");
    setNotice("");
    if (!submitterName.trim()) {
      setError("Please add your name before submitting.");
      return;
    }

    const payload: PublicSubmissionPayload = {
      people: people
        .filter((person) => person.firstName.trim())
        .map((person) => ({
          clientId: person.clientId,
          firstName: person.firstName.trim(),
          middleName: blankToUndefined(person.middleName),
          lastName: blankToUndefined(person.lastName),
          gender: blankToUndefined(person.gender),
          livingStatus: person.livingStatus,
          mobile: blankToUndefined(person.mobile),
          email: blankToUndefined(person.email),
          birthday: blankToUndefined(person.birthday),
          hijriBirthdayDay: optionalInt(person.hijriDay),
          hijriBirthdayMonth: optionalInt(person.hijriMonth),
          hijriBirthdayYear: optionalInt(person.hijriYear),
          passingDate: blankToUndefined(person.passingDate),
          notes: blankToUndefined(person.notes)
        })),
      weddings: weddings
        .filter((wedding) => wedding.firstPersonClientId && wedding.secondPersonClientId && wedding.weddingDate)
        .map((wedding) => ({
          firstPersonClientId: wedding.firstPersonClientId,
          secondPersonClientId: wedding.secondPersonClientId,
          weddingDate: wedding.weddingDate,
          notes: blankToUndefined(wedding.notes)
        }))
    };

    const validationError = validatePublicSubmission(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const { error: submitError } = await supabase.rpc("submit_public_family_details", {
      link_token: token,
      submitter_name: submitterName,
      submitter_email: submitterEmail,
      submitter_mobile: submitterMobile,
      submission_payload: payload
    });
    if (submitError) {
      setError(submitError.message);
      setSubmitting(false);
      return;
    }

    setNotice("Thank you. The family admin will review these details.");
    setPeople([newPublicPerson()]);
    setWeddings([]);
    setSubmitting(false);
  }

  return (
    <Screen eyebrow="Family details form" title={workspaceName ? `${workspaceName} details` : "Family details"} subtitle="Share dates respectfully. The family admin reviews every submission before it becomes a reminder.">
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
      {notice ? <InlineNotice>{notice}</InlineNotice> : null}
      {available ? (
        <>
          <Card>
            <FormField label="Your name" value={submitterName} onChangeText={setSubmitterName} />
            <FormField label="Your email" value={submitterEmail} onChangeText={setSubmitterEmail} keyboardType="email-address" autoCapitalize="none" />
            <FormField label="Your mobile" value={submitterMobile} onChangeText={setSubmitterMobile} keyboardType="phone-pad" />
          </Card>
          {people.map((person, index) => (
            <Card key={person.clientId}>
              <Badge label={`Person ${index + 1}`} />
              <FormField label="First name" value={person.firstName} onChangeText={(value) => updatePublicPerson(setPeople, person.clientId, { firstName: value })} />
              <FormField label="Middle name" value={person.middleName} onChangeText={(value) => updatePublicPerson(setPeople, person.clientId, { middleName: value })} />
              <FormField label="Last name" value={person.lastName} onChangeText={(value) => updatePublicPerson(setPeople, person.clientId, { lastName: value })} />
              <Text className="mb-2 font-body text-sm font-medium text-charcoal-light">Living status</Text>
              <View className="mb-3 flex-row flex-wrap">
                <ChoiceButton label="Living" selected={person.livingStatus === "living"} onPress={() => updatePublicPerson(setPeople, person.clientId, { livingStatus: "living" })} />
                <ChoiceButton label="Deceased" selected={person.livingStatus === "deceased"} onPress={() => updatePublicPerson(setPeople, person.clientId, { livingStatus: "deceased" })} />
              </View>
              <FormField label="Birthday" placeholder="1995-05-29" value={person.birthday} onChangeText={(value) => updatePublicPerson(setPeople, person.clientId, { birthday: value })} />
              <FormField label="Hijri Birthday (Waras) day" value={person.hijriDay} onChangeText={(value) => updatePublicPerson(setPeople, person.clientId, { hijriDay: value })} keyboardType="number-pad" />
              <FormField label="Hijri Birthday (Waras) month" value={person.hijriMonth} onChangeText={(value) => updatePublicPerson(setPeople, person.clientId, { hijriMonth: value })} keyboardType="number-pad" />
              <FormField label="Hijri Birthday (Waras) year" value={person.hijriYear} onChangeText={(value) => updatePublicPerson(setPeople, person.clientId, { hijriYear: value })} keyboardType="number-pad" />
              <FormField label={passingDateLabel} placeholder="2020-05-23" value={person.passingDate} onChangeText={(value) => updatePublicPerson(setPeople, person.clientId, { passingDate: value })} />
              <FormField label="Notes" value={person.notes} onChangeText={(value) => updatePublicPerson(setPeople, person.clientId, { notes: value })} multiline />
            </Card>
          ))}
          <QuietButton label="+ Add another person" onPress={() => setPeople((items) => [...items, newPublicPerson()])} />
          <SectionTitle>Wedding Anniversary</SectionTitle>
          {weddings.map((wedding, index) => (
            <Card key={wedding.clientId}>
              <Badge label={`Wedding ${index + 1}`} />
              <PublicPersonPicker label="First person" people={people} selectedId={wedding.firstPersonClientId} onSelect={(value) => updatePublicWedding(setWeddings, wedding.clientId, { firstPersonClientId: value })} />
              <PublicPersonPicker label="Second person" people={people} selectedId={wedding.secondPersonClientId} onSelect={(value) => updatePublicWedding(setWeddings, wedding.clientId, { secondPersonClientId: value })} />
              <FormField label="Wedding date" placeholder="2014-06-02" value={wedding.weddingDate} onChangeText={(value) => updatePublicWedding(setWeddings, wedding.clientId, { weddingDate: value })} />
              <FormField label="Notes" value={wedding.notes} onChangeText={(value) => updatePublicWedding(setWeddings, wedding.clientId, { notes: value })} multiline />
            </Card>
          ))}
          <View className="mt-3 gap-2">
            <QuietButton label="+ Add Wedding Anniversary" onPress={() => setWeddings((items) => [...items, newPublicWedding()])} />
            <PrimaryButton label={submitting ? "Submitting..." : "Submit family details"} onPress={() => void submit()} />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

export function InviteAcceptScreen({ navigation, route }: NavProps) {
  const { session, acceptInvitation } = useYaadiStore();
  const token = route?.params?.token ?? "";
  return (
    <Screen eyebrow="Workspace invite" title="Join family workspace" subtitle="Accept this invite using the same email address the admin invited.">
      <Card>
        {!session ? (
          <>
            <InlineNotice>Log in first, then reopen or accept this invitation.</InlineNotice>
            <PrimaryButton label="Go to login" onPress={() => navigation.navigate("Auth")} />
          </>
        ) : (
          <PrimaryButton label="Accept admin invite" onPress={() => void acceptInvitation(token).then(() => navigation.replace?.("Main"))} />
        )}
      </Card>
    </Screen>
  );
}

export function SubscriptionPlansScreen() {
  const { plans, workspace } = useYaadiStore();
  return (
    <Screen eyebrow="Workspace plans" title="Subscription plans" subtitle="Subscriptions belong to the family workspace. Checkout is deferred while trial gates are functional.">
      {plans.map((plan) => (
        <Card key={plan.id} accent={plan.name === "Family Plus" ? colors.mutedGold : colors.border}>
          <View className="flex-row items-center justify-between">
            <Badge label={plan.id === workspace?.planId ? "Current trial" : plan.name === "Family Plus" ? "Recommended" : "Family plan"} />
            {plan.name === "Family Plus" ? <Crown color={colors.goldDark} size={22} strokeWidth={1.8} /> : null}
          </View>
          <Text className="mt-5 font-heading text-[30px] font-medium leading-8 text-deep-charcoal">{plan.name}</Text>
          <Text className="mt-3 font-body text-base text-deep-charcoal">Rs {plan.priceMonthly}/month · Rs {plan.priceYearly}/year</Text>
          <Text className="mt-2 font-body text-sm leading-6 text-grey-dark">
            Up to {plan.maxPeople} people · {plan.maxAdmins} admin{plan.maxAdmins > 1 ? "s" : ""} · {plan.exportEnabled ? "Export data" : "Core reminders"}
          </Text>
        </Card>
      ))}
    </Screen>
  );
}

export function SettingsScreen({ navigation }: NavProps) {
  const { signOut } = useYaadiStore();
  return (
    <Screen eyebrow="Workspace" title="Settings" subtitle="Workspace preferences, access, and account tools.">
      <View className="gap-3">
        <QuietButton label="Reminder settings" onPress={() => navigation.navigate("ReminderSettings")} />
        <QuietButton label="Subscription plans" onPress={() => navigation.navigate("SubscriptionPlans")} />
        <QuietButton label="Access management" onPress={() => navigation.navigate("AccessManagement")} />
        <QuietButton label="Sign out" onPress={() => void signOut().then(() => navigation.replace?.("Auth"))} />
      </View>
    </Screen>
  );
}

export function SuperAdminDashboardScreen() {
  return (
    <Screen eyebrow="Platform" title="Super admin dashboard" subtitle="Platform controls are ready to build on the workspace and plan tables.">
      <InlineNotice>Use Supabase role assignment to mark platform operators as super admins before exposing global workspace controls.</InlineNotice>
    </Screen>
  );
}

function WorkspaceMissing({ navigation }: Pick<NavProps, "navigation">) {
  return (
    <Screen title="Choose a workspace" subtitle="Yaadi needs an active family workspace before record editing.">
      <PrimaryButton label="Workspace picker" onPress={() => navigation.navigate("WorkspacePicker")} />
    </Screen>
  );
}

function DateFormShell(props: { title: string; subtitle: string; error?: string; accent?: string; children: ReactNode }) {
  return (
    <Screen eyebrow="Important date" title={props.title} subtitle={props.subtitle}>
      <Card accent={props.accent}>
        {props.error ? <InlineNotice tone="error">{props.error}</InlineNotice> : null}
        {props.children}
      </Card>
    </Screen>
  );
}

function PersonPicker(props: { label: string; selectedPersonId: string; onSelect: (personId: string) => void }) {
  const people = useYaadiStore((state) => state.people);
  return (
    <View className="mb-4">
      <Text className="mb-2 font-body text-sm font-medium text-charcoal-light">{props.label}</Text>
      <View className="flex-row flex-wrap">
        {people.map((person) => (
          <ChoiceButton key={person.id} label={getPersonDisplayName(person)} selected={props.selectedPersonId === person.id} onPress={() => props.onSelect(person.id)} />
        ))}
      </View>
      {people.length === 0 ? <InlineNotice>Add a person first.</InlineNotice> : null}
    </View>
  );
}

function PublicPersonPicker(props: { label: string; people: PublicPersonDraft[]; selectedId: string; onSelect: (personId: string) => void }) {
  return (
    <View className="mb-4">
      <Text className="mb-2 font-body text-sm font-medium text-charcoal-light">{props.label}</Text>
      <View className="flex-row flex-wrap">
        {props.people.filter((person) => person.firstName).map((person) => (
          <ChoiceButton key={person.clientId} label={`${person.firstName} ${person.lastName}`.trim()} selected={props.selectedId === person.clientId} onPress={() => props.onSelect(person.clientId)} />
        ))}
      </View>
    </View>
  );
}

function ReminderOffsets() {
  return <InlineNotice>Reminder days: 7 days, 5 days, 2 days, 1 day, same day.</InlineNotice>;
}

function HijriMonthGuide() {
  return (
    <View className="mb-4 flex-row flex-wrap">
      {Array.from({ length: 12 }, (_, index) => (
        <Badge key={index + 1} label={`${index + 1} ${getHijriMonthName(index + 1)}`} tone="waras" />
      ))}
    </View>
  );
}

function ReminderPreview(props: {
  id?: string;
  name: string;
  title: string;
  text: string;
  timing: string;
  occurrenceText: string;
  milestone: string;
  tone?: "birthday" | "waras" | "passing";
}) {
  return (
    <Card accent={getToneColor(props.tone)}>
      <View className="flex-row flex-wrap items-start justify-between">
        <Badge label={props.timing} tone={props.tone === "waras" ? "waras" : props.tone === "passing" ? "passing" : "gold"} />
        <Text className="mt-1 font-body text-sm text-grey-dark">{props.occurrenceText}</Text>
      </View>
      <Text className="mt-4 font-body text-xs uppercase text-grey-dark">{props.title}</Text>
      <Text className="mt-2 font-heading text-[28px] font-medium leading-8 text-deep-charcoal">{props.name}</Text>
      <Text className="mt-2 font-body text-base leading-6 text-charcoal-light">{props.text}</Text>
      <Text className="mt-3 font-body text-sm font-medium text-gold-dark">{props.milestone}</Text>
    </Card>
  );
}

function QuickAction(props: { icon: typeof UserRoundPlus; label: string; onPress: () => void }) {
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

function getUpcomingCards(importantDates: ImportantDate[], people: Person[]) {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  return importantDates
    .map((date) => {
      const person = peopleById.get(date.personId);
      if (!person) {
        return null;
      }
      const occurrence = getOccurrenceDate(date);
      const offset = daysUntil(occurrence);
      const participants = (date.participantPersonIds ?? [date.personId])
        .map((personId) => peopleById.get(personId))
        .filter((participant): participant is Person => Boolean(participant));
      return {
        id: date.id,
        name: date.type === "wedding_anniversary" ? participants.map(getPersonDisplayName).join(" and ") : getPersonDisplayName(person),
        title: importantDateLabels[date.type],
        text: buildReminderMessage({ importantDate: date, person, participantPeople: participants, occurrenceDate: occurrence, reminderDaysBefore: offset }),
        timing: formatOffset(offset),
        occurrenceText: occurrence.toLocaleDateString(),
        milestone: getMilestoneText(date, occurrence, people),
        tone: date.type === "hijri_birthday_waras" ? "waras" as const : date.type === "passing_anniversary" ? "passing" as const : "birthday" as const,
        offset
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => a.offset - b.offset);
}

function getToneColor(tone?: "birthday" | "waras" | "passing") {
  if (tone === "waras") {
    return colors.hijriGreen;
  }
  if (tone === "passing") {
    return colors.passingPurple;
  }
  return colors.goldLight;
}

function formatOffset(offset: number) {
  if (offset === 0) {
    return "Today";
  }
  if (offset === 1) {
    return "Tomorrow";
  }
  return `In ${offset} days`;
}

function getMilestoneText(date: ImportantDate, occurrence: Date, people: Person[]) {
  if (date.type === "birthday" && date.gregorianDate) {
    return `Turning ${calculateGregorianAge(date.gregorianDate, occurrence)}`;
  }

  if (date.type === "hijri_birthday_waras") {
    const occurrenceHijri = gregorianToHijri(occurrence);
    const age = calculateHijriAge({ hijriBirthYear: date.hijriYear, currentHijriYear: occurrenceHijri.year });
    return age ? `Turning ${age} by Hijri age` : `Hijri date: ${formatHijriDayMonth(occurrenceHijri.month, occurrenceHijri.day)}`;
  }

  if (date.type === "wedding_anniversary" && date.gregorianDate) {
    const names = (date.participantPersonIds ?? [date.personId])
      .map((personId) => people.find((person) => person.id === personId))
      .filter((person): person is Person => Boolean(person))
      .map(getPersonDisplayName)
      .join(" and ");
    return `${calculateYearsMarried(date.gregorianDate, occurrence)} year Wedding Anniversary${names ? ` for ${names}` : ""}`;
  }

  if (date.gregorianDate) {
    return `${calculateYearsSincePassing(date.gregorianDate, occurrence)} year Anniversary of passing`;
  }

  if (date.hijriDay && date.hijriMonth) {
    return `Hijri remembrance: ${formatHijriDayMonth(date.hijriMonth, date.hijriDay)}`;
  }

  return "Important family date";
}

function describeImportantDate(date: ImportantDate, people: Person[]): string {
  if (date.type === "birthday" && date.gregorianDate) {
    return `${date.gregorianDate.toLocaleDateString()} · current age ${calculateGregorianAge(date.gregorianDate)}`;
  }

  if (date.type === "hijri_birthday_waras" && date.hijriDay && date.hijriMonth) {
    const next = getNextHijriBirthdayWarasOccurrence({ hijriDay: date.hijriDay, hijriMonth: date.hijriMonth });
    const currentHijri = gregorianToHijri(new Date());
    const hijriAge = calculateHijriAge({ hijriBirthYear: date.hijriYear, currentHijriYear: currentHijri.year });
    return `${formatHijriDayMonth(date.hijriMonth, date.hijriDay)} · next ${next.toLocaleDateString()}${hijriAge ? ` · Hijri age ${hijriAge}` : ""}`;
  }

  if (date.type === "wedding_anniversary" && date.gregorianDate) {
    const names = (date.participantPersonIds ?? [date.personId])
      .map((personId) => people.find((person) => person.id === personId))
      .filter((person): person is Person => Boolean(person))
      .map(getPersonDisplayName)
      .join(" and ");
    return `${names} · ${date.gregorianDate.toLocaleDateString()} · years married ${calculateYearsMarried(date.gregorianDate)}`;
  }

  if (date.gregorianDate) {
    return `${date.gregorianDate.toLocaleDateString()} · years since passing ${calculateYearsSincePassing(date.gregorianDate)}`;
  }

  return "Important date";
}

function getFamilyLink(token: string) {
  return `${getAppOrigin()}/family/${token}`;
}

function getInviteLink(token: string) {
  return `${getAppOrigin()}/invite/${token}`;
}

function getAppOrigin() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.EXPO_PUBLIC_APP_URL ?? "https://yaadi-five.vercel.app";
}

async function shareFamilyLink(link: string, setNotice: (message: string) => void) {
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(link);
    setNotice("Family form link copied. You can paste it into WhatsApp, email, or SMS.");
    return;
  }

  await Share.share({ message: link });
  setNotice("Family form link is ready to send.");
}

function clearFormError() {
  useYaadiStore.setState({ error: undefined });
}

function setFormError(message: string) {
  useYaadiStore.setState({ error: message });
}

function findPotentialMatches(firstName: string, lastName: string | undefined, people: Person[]) {
  const candidate = `${firstName} ${lastName ?? ""}`.trim().toLowerCase();
  return people.filter((person) => getPersonDisplayName(person).trim().toLowerCase() === candidate);
}

function readDate(value: string) {
  if (!isYmdString(value)) {
    throw new Error("Use date format YYYY-MM-DD, for example 1995-05-29.");
  }
  const [year, month, day] = value.trim().split("-").map(Number);
  return makeLocalDate(year, month, day);
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readInt(value: string) {
  const parsed = optionalInt(value);
  if (!parsed) {
    throw new Error("A number is required.");
  }
  return parsed;
}

function optionalInt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isYmdString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function validatePublicSubmission(payload: PublicSubmissionPayload) {
  if (payload.people.length === 0) {
    return "Add at least one person before submitting family details.";
  }

  for (const person of payload.people) {
    if (person.birthday && !isYmdString(person.birthday)) {
      return `Use YYYY-MM-DD for ${person.firstName}'s Birthday.`;
    }
    if (person.passingDate && !isYmdString(person.passingDate)) {
      return `Use YYYY-MM-DD for ${person.firstName}'s Date of Passing.`;
    }
    if ((person.hijriBirthdayDay && !person.hijriBirthdayMonth) || (!person.hijriBirthdayDay && person.hijriBirthdayMonth)) {
      return `Add both Hijri Birthday day and month for ${person.firstName}.`;
    }
  }

  for (const wedding of payload.weddings) {
    if (!isYmdString(wedding.weddingDate)) {
      return "Use YYYY-MM-DD for every Wedding Anniversary date.";
    }
    if (wedding.firstPersonClientId === wedding.secondPersonClientId) {
      return "Choose two different people for each Wedding Anniversary.";
    }
  }

  return "";
}

function blankToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function ChoiceGrid(props: { children: ReactNode }) {
  return <View className="mb-3 flex-row flex-wrap">{props.children}</View>;
}

function personName(person: Person) {
  return getPersonDisplayName(person);
}

function relationshipTypesByCategory(types: RelationshipType[]) {
  const grouped = new Map<string, RelationshipType[]>();
  for (const type of types) {
    grouped.set(type.category, [...(grouped.get(type.category) ?? []), type]);
  }
  return [...grouped.entries()];
}

function RelationshipRow(props: {
  relationship: PersonRelationship;
  people: Person[];
  relationshipTypes: RelationshipType[];
  onDelete: () => void;
}) {
  const person = props.people.find((item) => item.id === props.relationship.personId);
  const relatedPerson = props.people.find((item) => item.id === props.relationship.relatedPersonId);
  const relationshipType = props.relationshipTypes.find((item) => item.id === props.relationship.relationshipTypeId);

  return (
    <View className="mt-3 rounded-input border border-line bg-grey-light p-4">
      <Text className="font-body text-base text-deep-charcoal">
        {person ? personName(person) : "Person"} is {relationshipType?.name ?? "related"} to {relatedPerson ? personName(relatedPerson) : "person"}
      </Text>
      <Text className="mt-1 font-body text-xs uppercase text-grey-dark">Tree mapping: {props.relationship.coreTreeRelationship}</Text>
      {props.relationship.notes ? <Text className="mt-2 font-body text-sm leading-5 text-charcoal-light">{props.relationship.notes}</Text> : null}
      <View className="mt-3">
        <QuietButton label="Remove relationship" onPress={props.onDelete} />
      </View>
    </View>
  );
}

type PublicPersonDraft = {
  clientId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  livingStatus: Person["livingStatus"];
  mobile: string;
  email: string;
  birthday: string;
  hijriDay: string;
  hijriMonth: string;
  hijriYear: string;
  passingDate: string;
  notes: string;
};

type PublicWeddingDraft = {
  clientId: string;
  firstPersonClientId: string;
  secondPersonClientId: string;
  weddingDate: string;
  notes: string;
};

function newPublicPerson(): PublicPersonDraft {
  return {
    clientId: createClientId(),
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "",
    livingStatus: "living",
    mobile: "",
    email: "",
    birthday: "",
    hijriDay: "",
    hijriMonth: "",
    hijriYear: "",
    passingDate: "",
    notes: ""
  };
}

function newPublicWedding(): PublicWeddingDraft {
  return { clientId: createClientId(), firstPersonClientId: "", secondPersonClientId: "", weddingDate: "", notes: "" };
}

function updatePublicPerson(
  setPeople: Dispatch<SetStateAction<PublicPersonDraft[]>>,
  clientId: string,
  patch: Partial<PublicPersonDraft>
) {
  setPeople((people) => people.map((person) => (person.clientId === clientId ? { ...person, ...patch } : person)));
}

function updatePublicWedding(
  setWeddings: Dispatch<SetStateAction<PublicWeddingDraft[]>>,
  clientId: string,
  patch: Partial<PublicWeddingDraft>
) {
  setWeddings((weddings) => weddings.map((wedding) => (wedding.clientId === clientId ? { ...wedding, ...patch } : wedding)));
}

function createClientId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function navigateDateEditor(navigation: NavProps["navigation"], date: ImportantDate) {
  if (date.type === "birthday") {
    navigation.navigate("AddBirthday", { dateId: date.id });
    return;
  }
  if (date.type === "hijri_birthday_waras") {
    navigation.navigate("AddHijriBirthdayWaras", { dateId: date.id });
    return;
  }
  if (date.type === "wedding_anniversary") {
    navigation.navigate("AddWeddingAnniversary", { dateId: date.id });
    return;
  }
  navigation.navigate("AddPassingAnniversary", { dateId: date.id });
}

export const tabIcons = {
  Home,
  People: Users,
  Reminders: CalendarDays,
  Relations: Heart,
  Settings
};
