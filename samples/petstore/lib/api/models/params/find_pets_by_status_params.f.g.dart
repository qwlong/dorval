// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'find_pets_by_status_params.f.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$FindPetsByStatusParamsImpl _$$FindPetsByStatusParamsImplFromJson(
        Map<String, dynamic> json) =>
    _$FindPetsByStatusParamsImpl(
      status:
          (json['status'] as List<dynamic>).map((e) => e as String).toList(),
    );

Map<String, dynamic> _$$FindPetsByStatusParamsImplToJson(
        _$FindPetsByStatusParamsImpl instance) =>
    <String, dynamic>{
      'status': instance.status,
    };
