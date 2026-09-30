[<img src="https://about.mappls.com/images/mappls-b-logo.svg" height="60"/> </p>](https://www.mapmyindia.com/api)
# Mappls Maps SDK for React Native

**Easy To Integrate Maps & Location APIs & SDKs For Android Applications**

Powered with India's most comprehensive and robust mapping functionalities.

1. You can get your api key to be used in this document here: [Mappls Dashboard](https://auth.mappls.com/console)

2. The sample code is provided to help you understand the basic functionality of Mappls maps & REST APIs working on **Android** native development platform.

3. Explore through [200+ countries & territories](https://github.com/MapmyIndia/mapmyindia-rest-api/blob/master/docs/countryISO.md) with **Global Search, Routing and Mapping APIs & SDKs** by Mappls.


## Version History
| Version | Last Updated | Author |
| ---- | ---- | ---- |
| 2.0.3 | 28 Jul 2026 |Mappls API Team|
| 2.0.2 | 29 Sep 2025 |Mappls API Team|
| 2.0.1 | 17 Sep 2025 |Mappls API Team|

For more details of Previos version, [click here](https://github.com/mappls-api/mappls-react-native-sdk/blob/main/docs/v2.0.0/Version-History.md)

## [API Usage](#api-usage)

Your Mappls Maps SDK usage needs a set of license keys (get them  [here](https://auth.mappls.com/console)) and is governed by the API  [terms and conditions](https://about.mappls.com/api/terms-&-conditions). As part of the terms and conditions,  **you cannot remove or hide the Mappls logo and copyright information** in your project.

The allowed SDK hits are described on the user [dashboard](https://auth.mappls.com/console) page. Note that your usage is shared between platforms, so the API hits you make from a web application, Android app or an iOS app all add up to your allowed daily limit.


## [Prerequisite](#instructions)

1. Sign Up and Log In
   - Go to the [Mappls Dashboard](https://auth.mappls.com/console) and **sign up or log in**.
2. Create Separate Apps for Android & iOS
   - Create **two separate apps** in the Mappls Dashboard:
     - One for **React Native Android**
     - One for **React Native iOS**
3. Install Dependencies
   - Install all required dependencies for Mappls SDK integration into your React Native project.
4. Android Configuration
   - **Download configuration files** for your Android app (associated with the **Package Name** and **Signing Certificate SHA-256**).
   - Add the following configuration files to the **app-level root directory** of your Android project:
      ```
      <appId>.a.olf  
      <appId>.a.conf
      ```
5. iOS Configuration
   - To initialize and authenticate Mappls SDK on iOS, include the following configuration files in your project bundle:
     ```
     <appId>.i.olf  
     <appId>.i.conf
     ```
   - In your `ios/Podfile`, add the following line inside the `post_install` block:
     ```Swift
     $MAPPLS_MAPS.post_install(installer)
     ```

### How to create an app on Mappls Console
![Mappls Console - How to create apps](https://mmi-api-team.s3.ap-south-1.amazonaws.com/Mappls-SDKs/images/TestApp_iOS_1.gif)

### How to download config files from App from Console
![Mappls Console - How to create apps](https://mmi-api-team.s3.ap-south-1.amazonaws.com/Mappls-SDKs/images/TestApp_iOS_2.gif)


## Installation
**npm**
```
 npm install mappls-map-react-native --save
```

## Installation for Android
### Add Mappls Repository

- Add the Mappls repository to your `settings.gradle` or `settings.gradle.kts` file:
    #### Kotlin (settings.gradle.kts)
    ```kotlin
    dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven(url = "https://maven.mappls.com/repository/mappls/")
    }
    }
    ```
    #### Groovy (settings.gradle)
    ```groovy  
    dependencyResolutionManagement {  
    repositories {  
            google()  
            mavenCentral()  
            maven {  
                url 'https://maven.mappls.com/repository/mappls/'  
            }  
    }  
    } 
    ```
### Adding Mappls Configuration file
- Download Configuration files for your app (associated with <b>Package Name and Signing Certificate SHA-256</b>)
- Add Configuration files (`<appId>.a.olf` and `<appId>.a.conf`) into the module app-level root directory of your app

## Installation for IOS
- To initialize and authenticate any Mappls SDK, you must include IOS Configuration files(`<appId>.i.olf` and `<appId>.i.conf`) in your project bundle
- On iOS it's necessary to add $MAPPLS_MAPS.post_install(installer) to the post_install block in the ios/Podfile is necessary:
	```pods
	post_install do |installer|
	# Other post install hooks...
	+ $MAPPLS_MAPS.post_install(installer)
	end
	```

## How to Add a MapView
~~~javascript
import React, { Component } from "react";
import {View } from "react-native";
import  MapplsGL  from  'mappls-map-react-native';

export default class App extends Component {
 render() {
 return (
 <View style={{flex:1}}>
 <MapplsGL.MapView style={{flex:1}} >
	 <MapplsGL.Camera
		 ref={c  => (this.camera = c)}
		 zoomLevel={12}
		 minZoomLevel={4}
		 maxZoomLevel={22}
		 centerCoordinate={[77.231409,28.6162]}
	 />
 </MapplsGL.MapView>
 </View>
 );
 }
}
~~~


For any queries and support, please contact: 

[<img src="https://about.mappls.com/images/mappls-logo.svg" height="40"/> </p>](https://about.mappls.com/api/)
Email us at [apisupport@mappls.com](mailto:apisupport@mappls.com)


![](https://www.mapmyindia.com/api/img/icons/support.png)
[Support](https://about.mappls.com/contact/)
Need support? contact us!

<br></br>
<br></br>

[<p align="center"> <img src="https://www.mapmyindia.com/api/img/icons/stack-overflow.png"/> ](https://stackoverflow.com/questions/tagged/mappls-api)[![](https://www.mapmyindia.com/api/img/icons/blog.png)](https://about.mappls.com/blog/)[![](https://www.mapmyindia.com/api/img/icons/gethub.png)](https://github.com/Mappls-api)[<img src="https://mmi-api-team.s3.ap-south-1.amazonaws.com/API-Team/npm-logo.one-third%5B1%5D.png" height="40"/> </p>](https://www.npmjs.com/org/mapmyindia) 



[<p align="center"> <img src="https://www.mapmyindia.com/june-newsletter/icon4.png"/> ](https://www.facebook.com/Mapplsofficial)[![](https://www.mapmyindia.com/june-newsletter/icon2.png)](https://twitter.com/mappls)[![](https://www.mapmyindia.com/newsletter/2017/aug/llinkedin.png)](https://www.linkedin.com/company/mappls/)[![](https://www.mapmyindia.com/june-newsletter/icon3.png)](https://www.youtube.com/channel/UCAWvWsh-dZLLeUU7_J9HiOA)




<div align="center">@ Copyright 2025 CE Info Systems Ltd. All Rights Reserved.</div>

<div align="center"> <a href="https://about.mappls.com/api/terms-&-conditions">Terms & Conditions</a> | <a href="https://about.mappls.com/about/privacy-policy">Privacy Policy</a> | <a href="https://about.mappls.com/pdf/mapmyIndia-sustainability-policy-healt-labour-rules-supplir-sustainability.pdf">Supplier Sustainability Policy</a> | <a href="https://about.mappls.com/pdf/Health-Safety-Management.pdf">Health & Safety Policy</a> | <a href="https://about.mappls.com/pdf/Environment-Sustainability-Policy-CSR-Report.pdf">Environmental Policy & CSR Report</a>

<div align="center">Customer Care: +91-9999333223</div>
