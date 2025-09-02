// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pet.f.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$PetImpl _$$PetImplFromJson(Map<String, dynamic> json) => _$PetImpl(
      name: json['name'] as String,
      tag: json['tag'] as String?,
      category: json['category'] == null
          ? null
          : Category.fromJson(json['category'] as Map<String, dynamic>),
      photoUrls: (json['photo_urls'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      status: json['status'] as String? ?? 'available',
      id: (json['id'] as num).toInt(),
    );

Map<String, dynamic> _$$PetImplToJson(_$PetImpl instance) => <String, dynamic>{
      'name': instance.name,
      if (instance.tag case final value?) 'tag': value,
      if (instance.category?.toJson() case final value?) 'category': value,
      if (instance.photoUrls case final value?) 'photo_urls': value,
      if (instance.status case final value?) 'status': value,
      'id': instance.id,
    };
