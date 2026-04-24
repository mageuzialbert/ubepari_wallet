import { ActivityIndicator, View } from "react-native";
import { WebView } from "react-native-webview";
import { apiBaseUrl } from "@/api/client";
import { currentLocale } from "@/i18n";

export default function Privacy() {
  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ uri: `${apiBaseUrl()}/${currentLocale()}/legal/privacy` }}
        startInLoadingState
        renderLoading={() => (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator />
          </View>
        )}
      />
    </View>
  );
}
