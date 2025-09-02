// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'list_pets_params.f.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$ListPetsParamsImpl _$$ListPetsParamsImplFromJson(Map<String, dynamic> json) =>
    _$ListPetsParamsImpl(
      limit: (json['limit'] as num?)?.toInt(),
      offset: (json['offset'] as num?)?.toInt(),
    );

Map<String, dynamic> _$$ListPetsParamsImplToJson(
        _$ListPetsParamsImpl instance) =>
    <String, dynamic>{
      if (instance.limit case final value?) 'limit': value,
      if (instance.offset case final value?) 'offset': value,
    };
