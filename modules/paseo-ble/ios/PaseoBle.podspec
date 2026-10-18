Pod::Spec.new do |s|
  s.name           = 'PaseoBle'
  s.version        = '1.0.0'
  s.summary        = 'Bluetooth LE para la visita en grupo de Paseo'
  s.description    = 'Periférico GATT (anfitrión) y central (invitado) con CoreBluetooth.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'CoreBluetooth'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
